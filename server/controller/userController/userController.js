const otpModel = require("../../model/otpModel")
const userModel = require("../../model/userModel")
const catgModel = require("../../model/catagoryModel")
const productModel = require("../../model/productModel")
const nodemailer = require("nodemailer")
const mongoose = require("mongoose")
const flash = require("express-flash")
const passport = require('passport')
const bcrypt = require("bcrypt")
const otpGenerator = require("otp-generator")
const userRouter = require("../../routers/user")
const session = require("express-session")
const cartModel = require("../../model/cartModel")
require('dotenv').config();


// Environment variables
const Email = process.env.Email;
const pass = process.env.pass


// OTP generator function
const generatorotp = () => {
    try {
        const otp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            specialChars: false,
            lowerCaseAlphabets: false
        })
        console.log('otp has sended --------->> ', otp);
        return otp;
    } catch (err) {
        console.log(err);
        res.render('user/404Error')
    }
};



// Function to send email
const sendmail = async (email, otp) => {
    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: Email,
                pass: pass,
            },
        });

        let mailOptions = {
            from: "muhammadudaif786udaif@gmail.com",
            to: email,
            subject: 'E-mail Verification',
            html: `<p>Dear User,</p>
                   <p>Thank you for signing up with MaleFashions! To complete your registration, please use the following<br>
                   <span style="font-weight: bold; color: #ff0000;">OTP: ${otp}</span></p>
                   <p>Enter this OTP on our website to verify your email address and access your account.</p>
                   <p>If you did not sign up for MaleFashions!, please disregard this email.</p>
                   <p>Welcome aboard!</p>
                   <p>Best regards,<br/>The Vintagerags Team</p>`
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully ----------------->> ");
    } catch (err) {
        console.log(err);
        res.render('user/404Error')
    }
};


// Sign-up page
const signup = async (req, res) => {
    try {
        const categories = await catgModel.find();
        res.render("user/signup", {
            categories,
            expressFlash: {
                emailerror: req.flash("Email-Error"),
                passworderror: req.flash("Password-Error"),
            }
        });
    } catch (error) {
        console.log("Signup error: >>>>>>>" + error);
        res.render('user/404Error')
    }
};


// Sign-up data collecting
const signupPost = async (req, res) => {
    try {
        const { username, email, mobile: phone, password, confirm_password: cpassword } = req.body;
        const user = await userModel.findOne({ email });
 
        if (!user) {
            if (password !== cpassword) {
                req.flash('passworderror', "Passwords do not match, please try again.");
                return res.redirect('/signup');
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = {
                username,
                email,
                phone,
                password: hashedPassword
            };

            req.session.user = newUser;
            req.session.signup = true;

            const otp = generatorotp();
            const currTime = Date.now();
            const expTime = currTime + 60 * 1000;

            await otpModel.updateOne({ email }, { $set: { email, otp, expiry: new Date(expTime) } }, { upsert: true });
            await sendmail(email, otp);

            res.redirect("/otp");
        } else {
            req.flash('emailerror', "User already exists.");
            res.redirect('/signup');
        }
    } catch (error) {
        console.error("Signup post error: >>>", error);
        res.render('user/404Error')
    }
};



// Otp getting
const otp = async (req, res) => {
    try {
        const otp = await otpModel.findOne({ email: req.session.user.email })
        res.render('user/otp', {
            expressFlash: {
                otperror: req.flash("otperror")
            },
            otp: otp
        })
    } catch (error) {
        console.log(error);
        res.render('user/404Error')
    }
};

// Otp data collecting
const verifyotp = async (req, res) => {
    try {
        const ArrayOtp = req.body.otp;
        console.log(ArrayOtp);
        const enteredotp = parseInt(ArrayOtp.join(''))
        console.log(enteredotp)
        const user = req.session.user.username
        console.log(req.session.user + ">>>>>>>>>");
        // console.log(user);
        const email = req.session.user.email
        // console.log(email);
        const userdb = await otpModel.findOne({ email: email })
        // console.log(userdb);
        const otp = userdb.otp
        const expiry = userdb.expiry
        if (enteredotp == otp && expiry.getTime() >= Date.now()) {
            user.isVerified = true;
            if (req.session.signup) {
                await userModel.create(req.session.user)
                const userdata = await userModel.findOne({ email: email })
                req.session.userId = userdata._id;
                req.session.isAuth = true;
                req.session.signup = false;
                res.redirect("/")
            }
        } else {
            req.flash('otperror', 'wrong otp or time expired')
            return res.redirect('/otp')
        }
    } catch (error) {
        console.log("verifyotp error undallo..>>>>>>>>>>>" + error);
        res.render('user/404Error')
    }
}

const resendotp = async (req, res) => {
    try {
        const email = req.session.user.email
        const otp = generatorotp()

        const currTime = Date.now()
        const expiry = currTime + 60 * 1000
        await otpModel.updateOne({ email: email }, { otp: otp, expiry: new Date(expiry) })
        await sendmail(email, otp)
        res.redirect("/otp")
    } catch (error) {
        console.log("resend otp error undallo" + error);
        res.render('user/404Error')
    }
}



// Home page 
const index = async (req, res) => {
    try {
        const categories = await catgModel.find();
        const id = req.session.userId;
        const products = await productModel.find().limit(9);

        // Assuming req.user is correctly populated
        if (req.user) {
            req.session.isAuth = true;
            req.session.userId = req.user._id;
        }

        const result = await cartModel.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(id) } },
            { $unwind: '$items' },
            { $group: { _id: null, itemCount: { $sum: 1 } } }
        ]);

        if (result.length > 0) {
            const itemCount = result[0].itemCount;
            req.session.cartCount = itemCount;
        } else {
            console.log('Cart not found for the user');
        }

        const cartItems = await cartModel.findOne({ userId: id });

        let Cart_total = 0;
        if (cartItems) {
            Cart_total = cartItems.items.reduce((total, item) => total + item.price, 0);
        }

        req.session.Cart_total = Cart_total;
        const itemCount = req.session.cartCount;
        
        res.render('user/index', { products, itemCount, Cart_total, categories });
    } catch (error) {
        console.log("index error: " + error);
        res.render('user/404Error');
    }
};





const loginPost = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const user = await userModel.findOne({ email: email });

        if (user && user.blocked === false && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id;
            req.session.username = user.username;
            req.session.user = user;
            req.session.isAuth = true;
            res.redirect('/');
        } else {
            req.flash('invalidpassword', "Invalid Email or Password");
            res.redirect('/login');
        }
    } catch (error) {
        console.log("login Post error undallo -------->  ", error);
        req.flash('invaliduser', "Invalid Email or Password");
        res.redirect('/login');
    }
};

// Login page
const login = async (req, res) => {
    try {
        res.render('user/login', {
            expressFlash: {
                invaliduser: req.flash("invaliduser"),
                invalidpassword: req.flash("invalidpassword"),
                usersuccess: req.flash("usersuccess")
            }
        });
    } catch (error) {
        console.log("error in login: " + error);
        res.render('user/404Error');
    }
};


//  Profile Users
const profile = async (req, res) => {
    try {
        const id = req.session.userId;
        const categories = await catgModel.find()
        const user = await userModel.findOne({ _id: id })
        const name = user.username
        const email = user.email
        const success = req.flash('success')
        const itemCount = req.session.cartCount;
        const Cart_total = req.session.Cart_total
        res.render('user/profile', { name, email, success, itemCount, Cart_total })
    } catch (error) {
        console.log('profile error undallo >>>>>>>>>  ' + error);
        res.render('user/404Error')
    }
}


// Logout Proccessing
const logout = async (req, res) => {
    try {
        req.session.isAuth = false
        req.logOut(function (err) {
            if (err) {
                console.error('LogOut error undallo .. >>>>>>>>>' + err);
            }
            // redirecting after logouting
            console.log("Loggout done>>>>>>>>>>>");
            res.redirect('/login')
        })
    } catch (error) {
        console.log("log Out error ind :::::::::::::::::::::::::::::::::::::::::::::");
        res.render('user/404Error')
    }
}


//Contact 
const contact = async (req,res) => {
    try {
        const itemCount = req.session.cartCount;
        const Cart_total = req.session.Cart_total
        res.render('user/contact' , { itemCount, Cart_total })
    } catch (error) {
        console.log('conatct error undallo --------->> ',error);
        res.render('user/404Error')
    }
}


// Google SignIn
const googleSignIn = passport.authenticate('google', {
    scope: ['email', 'profile']
});

const googleCallback = passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/auth/failure'
});

const authFailure = (req, res) => {
    res.send('Something went wrong ---------->> ');
};




module.exports = { otp, generatorotp, sendmail, login, index, signup, signupPost, verifyotp, resendotp, loginPost, profile, logout, contact, googleSignIn, googleCallback, authFailure }