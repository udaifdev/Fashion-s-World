const addressModel = require('../../model/AddressModel')
const userModel = require('../../model/userModel')
const orderModel = require('../../model/orderModel')
const productModel = require('../../model/productModel')
const couponsModel = require('../../model/coupenModel')
const walletModel = require('../../model/walletModel')
const couponModel = require('../../model/coupenModel')
const Razorpay = require('razorpay')
const easyinvoice = require('easyinvoice')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const flash = require('express-flash')
const { login } = require('./userController')
const path = require('path')
const fs = require('fs')





const order_show = async (req, res) => {
    const userId = req.session.userId;

    try {
        const orders = await orderModel.find({ userId: userId }).sort({ createdAt: -1 }).populate({
            path: 'items.productId',
            select: 'name image _id',
        }).exec()


        const itemCount = req.session.cartCount
        const Cart_total = req.session.Cart_total
        res.render('user/orders', { order: orders, itemCount: itemCount, Cart_total: Cart_total })


    } catch (error) {
        console.log("orders show error undallo ==========>>>>>> ", error);
    }
}


// Reset password page view
const Reset_pass = async (req, res) => {
    try {
        const pass = req.flash('pass')
        const Cart_total = req.session.Cart_total
        const itemCount = req.session.cartCount
        res.render('user/ChangePass', { pass, Cart_total, itemCount })
    } catch (error) {
        console.log("Reset Password error undallo...................", error);
    }
}

//Reset Password Post 
const Reset_Pass_Post = async (req, res) => {
    try {
        const { pass, Npass, Cpass } = req.body
        console.log("<<<<<<<<<<<<<  " + `pass ${pass} Npass ${Npass} , Cpass ${Cpass}`);

        const userId = req.session.userId
        const user = await userModel.findOne({ _id: userId })
        const isPassword = await bcrypt.compare(Npass, user.password)

        if (isPassword) {
            req.flash('pass', 'Enter Different Password')
            // return res.redirect('/ChangePass');
        }
        if (Npass !== Cpass) {
            req.flash('pass', 'password dose not match')
            // return res.redirect('/ChangePass')
        }
        const passwordMatch = await bcrypt.compare(pass, user.password)
        if (passwordMatch) {
            const hashedPassword = await bcrypt.hash(Npass, 10)
            const newuser = await userModel.updateOne({ _id: userId }, { password: hashedPassword })
            console.log("password updated");
            req.flash("success", "Password updated successfully!");
            return res.redirect('/profile')
        } else {
            req.flash('pass', 'Invalid Password')
            // return res.redirect('/ChangePass')
        }

    } catch (error) {
        console.log('Reset pass Post error undallo');
    }
}



// Address Showing Page
const viewAddress = async (req, res) => {
    try {
        const userId = req.session.userId
        const data = await addressModel.findOne({ userId: userId })
        req.session.checkoutSave = false
        const Cart_total = req.session.Cart_total
        const itemCount = req.session.cartCount
        res.render('user/address', {
            userData: data,
            Cart_total: Cart_total, itemCount: itemCount
        })
    } catch (error) {
        console.log("address error undallo >>>  " + error)
    }
}


//  Add Address Page
const addAddress = async (req, res) => {
    try {
        const Cart_total = req.session.Cart_total
        const itemCount = req.session.cartCount
        res.render('user/addAddress', { Cart_total, itemCount })
    } catch (error) {
        console.log('addAddress error undallo bro >>>>>>  ' + error);
    }
}

// Add Address Post
const addAddressPost = async (req, res) => {
    try {
        const { name, mobile, email, housename, street, city, state, country, pincode, saveas } = req.body
        const userId = req.session.userId
        const existingUser = await addressModel.findOne({ userId: userId })

        if (existingUser) {
            const existAddress = await addressModel.findOne({
                'userId': userId,
                'address.name': name,
                'address.mobile': mobile,
                'address.email': email,
                'address.housename': housename,
                'address.street': street,
                'address.city': city,
                'address.state': state,
                'address.country': country,
                'address.pincode': pincode,
                'address.save_as': saveas
            })

            if (existAddress) {
                if (req.session.checkoutSave) {
                    return res.redirect('/checkout')
                }
                return res.redirect('/move/address')
            }

            existingUser.address.push({
                name: name,
                mobile: mobile,
                email: email,
                housename: housename,
                street: street,
                city: city,
                state: state,
                country: country,
                pincode: pincode,
                save_as: saveas
            })
            await existingUser.save()

            if (req.session.checkoutSave) {
                return res.redirect('/checkout')
            }
            return res.redirect('/move/address')
        }
        
        const newAddress = await addressModel.create({
            userId: userId,
            address: {
                name: name,
                mobile: mobile,
                email: email,
                housename: housename,
                street: street,
                city: city,
                state: state,
                country: country,
                pincode: pincode,
                save_as: saveas,
            },
        })

        if (req.session.checkoutSave) {
            return res.redirect('/checkout')
        }

        res.redirect('/move/address')

    } catch (error) {
        console.log("add address post error undallo >>>>>> " + error);
    }
}

// Adddress Deleteing
const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.userId
        const id = req.params.id

        const result = await addressModel.findOneAndUpdate(
            { userId: userId, 'address._id': id },
            { $pull: { address: { _id: id } } }
        );
        if (result) {
            res.redirect('/move/address');
        } else {
            console.log("Address not found or deletion failed");
        }
    } catch (error) {
        console.log("delete Address error undallo >>>> " + error);
    }
}

// Edit Address Page
const editAddress = async (req, res) => {
    try {
        const userId = req.session.userId
        const id = req.params.id
        const address = await addressModel.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(userId) }
            }, {
                $unwind: '$address'
            }, {
                $match: { 'address._id': new mongoose.Types.ObjectId(id) }
            }
        ]);
        const Cart_total = req.session.Cart_total
        const itemCount = req.session.cartCount
        res.render('user/editAddress', { addrs: address[0], Cart_total: Cart_total, itemCount: itemCount })

    } catch (error) {
        console.log("edit Address error undallo mone >>>>>>>>>>> " + error);
    }
}



const editPost = async (req, res) => {
    try {
        const { name, mobile, email, housename, street, city, state, country, pincode, saveas } = req.body
        const addressId = req.params.id
        const userId = req.session.userId

        const isAddressExists = await addressModel.find({
            userId: userId,
            'address': {
                $elemMatch: {
                    '_id': { $ne: addressId },
                    'save_as': saveas,
                    'email': email,
                    'name': name,
                    'mobile': mobile,
                    'housename': housename,
                    'street': street,
                    'pincode': pincode,
                    'city': city,
                    'state': state,
                    'country': country,
                }
            }
        })
        if (isAddressExists.length > 0) {
            return res.status(400).send('Address already exists');
        }

        const result = await addressModel.updateOne({
            'userId': userId, 'address._id': addressId
        },
            {
                $set: {
                    'address.$.save_as': saveas,
                    'address.$.name': name,
                    'address.$.email': email,
                    'address.$.mobile': mobile,
                    'address.$.housename': housename,
                    'address.$.street': street,
                    'address.$.pincode': pincode,
                    'address.$.city': city,
                    'address.$.state': state,
                    'address.$.country': country,
                }
            }
        )
        res.redirect('/move/address')
    } catch (error) {
        console.log("addressPost error undallo >>>>>>>> " + error);
    }
}



// Product Item Cancel 
const itemCancel = async (req, res) => {

    try {
        const orderId = req.params.orderId
        const productId = req.params.productId

        // console.log('OrderId and ProductId ------||  ' , orderId , productId);
        const order = await orderModel.findOne({ _id: orderId });
        if (!order) {
            console.log('Order not found');
            return res.redirect("/orders");
        }

        const product = order.items.find(item => item.productId.toString() === productId.toString());
        if (!product) {
            console.log('Product not found in order');
            return res.redirect("/orders");
        }

        if (order.items.length === 1) {
            order.status = 'Cancelled';
            order.updated = new Date();
        } else {
            order.amount -= product.price;
            order.items.pull({ productId: productId, size: product.size })
            order.updated = new Date();
        }
        await order.save();

        if (order.payment === 'upi' || order.payment === 'wallet') {
            const userId = req.session.userId;
            const user = await userModel.findOne({ _id: userId });
            if (user) {
                user.wallet += product.price;
                await user.save();

                const wallet = await walletModel.findOne({ userId: userId });
                if (!wallet) {
                    const newWallet = new walletModel({
                        userId: userId,
                        history: [{ transaction: "Credited", amount: product.price, date: new Date(), reason: "Item Cancelled" }]
                    });
                    await newWallet.save();
                } else {
                    wallet.history.push({ transaction: "Credited", amount: product.price, date: new Date(), reason: "Item Cancelled" });
                    await wallet.save();
                }
            }
        }

        const products = await productModel.find({ _id: productId });

        let sizeIndex = -1;
        for (let i = 0; i < products[0].stock.length; i++) {
            if (products[0].stock[i].size === product.size) {
                sizeIndex = i;
                break;
            }
        }
        // console.log('44444444  product cancelation is reache ============>>');

        if (sizeIndex !== -1) {
            products[0].stock[sizeIndex].quantity += product.quantity;
            products[0].totalstock += product.quantity;
            await products[0].save();
        } else {
            console.log('Size not found in product stock');
        }

        res.redirect("/orders");

    } catch (error) {
        console.log('item Cancel error undallo ------------>   ', error);
    }
}



// Order Item Cancelling 
const order_Cancelling = async (req, res) => {
    console.log(" Order cancellling reached -------------)) ");
    try {
        const id = req.params.id;
        const update_order = await orderModel.updateOne({ _id: id }, { status: 'Cancelled', updated: new Date() })
        const orderId = await orderModel.findOne({ _id: id })

        if (orderId.payment == 'upi' || orderId.payment == 'wallet') {
            const userId = req.session.userId
            const user = await userModel.findOne({ _id: userId })

            console.log("------------|| ", orderId.amount)

            user.wallet += parseInt(orderId.amount)
            await user.save()

            const wallet = await walletModel.findOne({ userId: userId })
            if (!wallet) {
                const newWallet = new walletModel({
                    userId: userId,
                    history: [
                        {
                            transaction: "Credited",
                            amount: orderId.amount,
                            date: new Date(),
                            reason: "Order Cancelled"
                        }
                    ]
                })
                await newWallet.save();
            } else {
                wallet.history.push({
                    transaction: "Credited",
                    amount: orderId.amount,
                    date: new Date(),
                    reason: "Order Cancelled"
                })
                await wallet.save();
            }
        }

        const items = orderId.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size
        }))

        console.log(" Order cancellling reached 3 -------------)) ");

        for (const item of items) {
            const product = await productModel.findOne({ _id: item.productId })

            const size = product.stock.findIndex(size => size.size == item.size)
            product.stock[size].quantity += item.quantity;
            product.totalstock += item.quantity;
            await product.save()
        }

        console.log(" Order cancellling reached 4 -------------)) ");

        res.redirect('/orders')

    } catch (error) {
        console.log('oreder Canceling Error undallo ------------->   ', error);
    }
}



// Order Tracking 
const order_tracking = async (req, res) => {
    try {
        const id = req.params.id
        const order = await orderModel.findOne({ _id: id }).populate({
            path: 'items.productId',
            select: 'name images'
        })
        const orderSuccess = req.flash('Order_Success')
        const itemCount = req.session.cartCount;
        const Cart_total = req.session.Cart_total
        res.render('user/orderTracking', { order: order, itemCount, Cart_total, orderSuccess })
    } catch (error) {

    }
}


// Order Return Reason 
const Return_Reason = async (req, res) => {

    try {
        const itemId = req.body.itemId;
        const reason = req.body.reason;

        const order = await orderModel.findById(itemId)

        if (!order.return || order.return.length === 0) {
            order.return = [{ reason, status: 'Pending' }];
        } else {
            order.return[0].reason = reason;
            order.return[0].status = 'Pending'
        }

        order.updated = new Date()
        await order.save()

        res.status(200).json({ message: 'Order return request processed successfully' })

    } catch (error) {
        console.log('return reason error undallo --------->>  ', error);
    }
}



// Re_Order 
const reOrder = async (req, res) => {

    console.log("reOrder cheking aai reache aai --------------->> ");

    try {
        const orderId = req.params.id;
        const ordersId = orderId.trim();
        const userId = req.session.userId;
        const order = await orderModel.findOne({ orderId: ordersId });
        const { pay, wallet } = req.body;
        const parsedWallet = parseInt(wallet);
        if (pay == 'paymentPending') {
            res.redirect(`/order-tracking/${order._id}`)
        } else if (pay == 'wallet') {
            const update = await orderModel.updateOne({ orderId: ordersId }, {
                wallet: parsedWallet,
                payment: pay,
                status: "pending",
                updated: new Date()
            })
            const userWallet = await walletModel.findOne({ userId: userId })
            userWallet.history.push({
                transaction: "Debited",
                amount: parsedWallet,
                date: new Date(),
                reason: "Product Purchased"
            })
            await userWallet.save();
            const user = await userModel.findOne({ _id: userId })
            user.wallet -= parsedWallet;
            await user.save();
        } else {
            const update = await orderModel.updateOne({ orderId: ordersId }, {
                payment: pay,
                status: "pending",
                updated: new Date()
            })
        }
        req.flash('orderSuccess', 'Your Order is Successfull!')
        res.redirect(`/order-tracking/${order._id}`)
    } catch (error) {
        console.log(error);
        res.render('user/serverError');
    }
}


// Coupons view page
const coupons = async (req, res) => {
    try {
        const coupons = await couponModel.find({ status: true })

        const itemCount = req.session.cartCount;
        const Cart_total = req.session.Cart_total

        res.render('user/coupens', { coupons, itemCount, Cart_total })

    } catch (error) {
        console.log('coupons user side profail error undallo -------->>  ', error);
    }
}


// Wallet view page
const wallet = async (req, res) => {
    try {
        const userId = req.session.userId;

        const user = await userModel.findOne({ _id: userId })

        const wallet = await walletModel.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: "$history" },
            { $sort: { "history.date": -1 } }
        ]);
        const itemCount = req.session.cartCount;
        const Cart_total = req.session.Cart_total
        res.render('user/wallet', { wallet: wallet, user: user, itemCount, Cart_total })
    } catch (error) {
        console.log("wallet error undallo ------------>>   ", error);
    }
}

const instance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET,
});


const walletupi = async (req, res) => {
    console.log("walletupi ---------->   ", req.body);
    var options = {
        amount: 500,
        currency: "INR",
        receipt: "order_rcpt"
    };
    instance.orders.create(options, function (err, order) {
        res.send({ orderId: order.id })
    })
}

const walletTopup = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await userModel.findOne({ _id: userId })
        const Amount = parseFloat(req.body.Amount)
        const wallet = await walletModel.findOne({ userId: userId });
        user.wallet += Amount;
        wallet.history.push({
            transaction: "Credited",
            amount: Amount,
            date: new Date(),
            reason: "Wallet Topup"
        });

        await wallet.save();
        await user.save();
        res.redirect("/wallet")
    } catch (error) {
        console.error('Error handling Razorpay callback:---------->  ', error);
    }
}


// Download Invoice 
const downloadInvoice = async (req, res) => {

    // console.log('download invoice reached ----------->>')

    try {
        const orderId = req.params.id;
        const order = await orderModel.findOne({ orderId: orderId }).populate({
            path: 'items.productId',
            select: 'name',
        });

        // console.log('order download invoice ----------->>  ', order);

        const pdfBuffer = await generateInvoice(order);

        // console.log('pdf Buffer --------->   ', pdfBuffer);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('download invoice error undallo --------->   ', error);
        res.status(500).send('Error generating invoice');
    }
};

// function
const generateInvoice = async (order) => {
    try {
        let totalAmount = order.amount;
        // console.log('total amount generate invoice ------------>>  ', totalAmount);

        const data = {
            documentTitle: 'Invoice',
            currency: 'INR',
            marginTop: 25,
            marginRight: 25,
            marginLeft: 25,
            marginBottom: 25,
            images: {
                logo: "", // add logo
            },
            sender: {
                company: "Male Fashion's",
                address: '11th Cross, HSR LayOut, Banglore, India',
                zip: '667678',
                city: 'Banglore',
                country: 'INDIA',
                phone: '1234567891',
                email: 'MaleFashion7@gmail.com',
                website: 'www.malefashion.com',
            },
            invoiceNumber: `INV-${order.orderId}`,
            invoiceDate: new Date().toJSON(),
            products: order.items.map(item => ({
                quantity: item.quantity,
                description: item.productId.name,
                price: item.price,
            })),
            total: `₹${totalAmount.toFixed(2)}`,
            tax: 0,
            bottomNotice: 'Thank you for shopping at MaleFashion!',
        };

        // console.log('Invoice data:', data);

        const result = await easyinvoice.createInvoice(data);
        // console.log('Invoice creation result :--------------------> '  , result);

        if (result.pdf) {
            const pdfBuffer = Buffer.from(result.pdf, 'base64');
            return pdfBuffer;
        } else {
            throw new Error('PDF generation failed, no PDF data returned ----------->>');
        }
    } catch (error) {
        console.error('generate invoice function error undalle ----------->  ', error);
        throw error; // Ensure the error is propagated to the caller
    }
};





module.exports = {
    viewAddress,
    addAddress,
    addAddressPost,
    editPost,
    deleteAddress,
    editAddress,
    Reset_pass,
    Reset_Pass_Post,
    order_show,
    itemCancel,
    order_tracking,
    order_Cancelling,
    Return_Reason,
    coupons,
    wallet,
    walletTopup,
    walletupi,
    reOrder,
    downloadInvoice
}