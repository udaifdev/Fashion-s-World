
const userModel = require("../server/model/userModel")


const Logged = async (req, res, next) => {
    try {
        const user = await userModel.findOne({ _id: req.session.userId })
        if (req.session.isAuth && user && user.blocked == false) {
            next()
        } else {
            res.redirect('/login')
        }
    } catch (error) {
        console.log("Logged Middleware error undallo >>>>" + error);
    }
}


const ifLogged = async (req, res, next) => {
    try {
        if (req.session.isAuth) {
            res.redirect("/")
        } else {
            next()
        }
    } catch (error) {
        console.log(" ifLogged error undallo..>>>>>>>>" + error);
    }
}


const signed = async (req, res, next) => {
    try {
        if (req.session.signup || req.session.forgot) {
            next()
        } else {
            res.redirect('/')
        }
    } catch (err) {
        console.log("signed functionl error undallo...>>>>>>. " + err);
        // res.render('user/serverError')
    }
}


const checkoutValid = async (req, res, next) => {
    try {
        if (req.session.checkout) {
            next()
        } else {
            res.redirect('/login')
        }
    } catch (error) {
        console.log('checkout middleware error undallo  ----------->>    ' , error);   
    }
}




module.exports = { signed, ifLogged, Logged, checkoutValid }