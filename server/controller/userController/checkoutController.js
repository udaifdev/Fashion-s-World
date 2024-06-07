const mongoose = require('mongoose')
const userModel = require('../../model/userModel')
const productModel = require('../../model/productModel')
const addresModel = require('../../model/AddressModel')
const cartModel = require('../../model/cartModel')
const orderModel = require('../../model/orderModel')
const couponModel = require('../../model/coupenModel')
const walletModel = require('../../model/walletModel')
const Razorpay = require('razorpay')



// RazorPay key id and key secret 
var instance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET,
});



const checkout = async (req, res) => {
    try {
        const userId = req.session.userId;
        req.session.checkoutSave = true;

        const [cart, addressDocs] = await Promise.all([
            cartModel.findOne({ userId: userId }),
            addresModel.find({ userId: userId })
        ]);

        const productIds = cart.items.map(product => product.productId);
        const products = await productModel.find({ _id: { $in: productIds } });

        const enrichedCartData = cart.items.map(cartProduct => {
            const product = products.find(p => p._id.equals(cartProduct.productId));
            return {
                ...cartProduct,
                name: product.name,
                price: product.price,
                image: product.image[0]
            };
        });

        const user = await userModel.findById(userId);
        const availableCoupons = await couponModel.find({
            couponCode: { $nin: user.usedCoupons },
            status: true,
        });

        const finalAmount = req.session.finalAmount;
        const discountAmount = req.session.discountAmount;
        const itemCount = req.session.cartCount;
        const deliveryCharge = 99;
        let Cart_total = req.session.Cart_total;

        // Add delivery charge to the Cart_total
        Cart_total += deliveryCharge;

        let myCart = await cartModel.findOne({ userId: userId });
        myCart.Cart_total = Cart_total;

        // Flatten the addresses array from all address documents
        const addresses = addressDocs.flatMap(doc => doc.address);

        console.log('addresses --------->>>   ', addresses);

        res.render('user/checkout', {
            cart: cart,
            cartItems: enrichedCartData,
            addresses: addresses,
            availableCoupons: availableCoupons,
            itemCount: itemCount,
            Cart_total: Cart_total,
            finalAmount: finalAmount,
            discountAmount: discountAmount,
            deliveryCharge: deliveryCharge
        });

    } catch (error) {
        console.log('check out error undallo ..................  ', error);
        res.render('user/404Error')
    }
}

const wallet = async (req, res) => {
    console.log("reache wallet controller ---------->>");
    try {
        const amount = req.body.amount
        const user = await userModel.findOne({ _id: req.session.userId })

        console.log(typeof user.wallet)

        if (user.wallet >= amount) {
            res.json({ success: true })
        }
        else {
            res.json({ success: false, amount: user.wallet })
        }
    } catch (error) {
        console.log("wallet error undallo -----------> ", error);
        res.render('user/404Error')
    }
}



// Order Post check out
const order_post = async (req, res) => {
    console.log('reached order post ------1------>>>  ');

    try {
        // const { address, payment_method } = req.body;
        const { address, pay } = req.body;
        console.log('body looking ------------->   ', req.body);
        // console.log('body value looking ------------->   ' , req.body.pay);
        let amount = parseInt(req.body.amount);
        let wallet = parseInt(req.body.wallet)

        console.log(typeof amount, typeof wallet); // Log type of amount

        const userId = req.session.userId;
        const cart = await cartModel.findOne({ userId: userId });
        const userAddress = await addresModel.findOne({ userId: userId });
        const selectedAddress = userAddress.address[address];

        console.log('user Address ------------>>>  ', userAddress);
        console.log('selected Address ------------>>   ', selectedAddress);
        const items = cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            price: item.price
        }));

        for (const item of items) {
            const product = await productModel.findOne({ _id: item.productId });
            const size = product.stock.findIndex(stockSize => stockSize.size == item.size);

            if (size !== -1) {
                product.stock[size].quantity -= item.quantity;
                product.totalstock -= item.quantity;
                await product.save();
            } else {
                console.log(`Size '${item.size}' not found in stock for product '${product._id}'.`);
                // Handle the case where the size is not found in stock
                return res.status(500).send("Internal Server Error");
            }
        }


        let order;
        if (pay == 'paymentPending') {
            console.log('paymentPending page conditionlek reached ---------->> ');
            order = new orderModel({
                userId: userId,
                items: items,
                amount: amount,
                wallet: wallet,
                status: "paymentPending",
                payment: pay,
                address: selectedAddress,
                createdAt: new Date(),
                updated: new Date()
            });
        } else {
            console.log(' else page conditionlek reached ---------->> ');
            order = new orderModel({
                userId: userId,
                items: items,
                amount: amount,
                wallet: wallet,
                payment: pay,
                address: selectedAddress,
                createdAt: new Date(),
                updated: new Date()
            });
        }

        if (wallet > 0) {
            const userWallet = await walletModel.findOne({ userId: userId })
            userWallet.history.push({
                transaction: "Debited",
                amount: wallet,
                date: new Date(),
                reason: "Product Purchased"
            })
            await userWallet.save();
            const user = await userModel.findOne({ _id: userId })
            user.wallet -= wallet;
            await user.save();

        }

        cart.items = [];
        cart.Cart_total = 0;

        // Save changes to cart before proceeding
        await cart.save();

        const saveOrder = await order.save();
        req.session.orderId = saveOrder.orderId;

        return res.redirect('/orderCornformPage');

    } catch (error) {
        console.log("Order_post error undallo =========>>>>>  ", error);
        res.render('user/404Error')
    }
}


// Upi Part
const upi = async (req, res) => {
    try {
        console.log("Reached Upi Sector ------------>> ");

        var options = {
            amount: req.body.amount,
            currency: 'INR',
            receipt: 'order_rcpt'
        };

        console.log('options upi --------->   ', options);

        instance.orders.create(options, function (err, order) {
            res.send({ orderId: order.id })
        })

    } catch (error) {
        console.log('upi error undallo -------> ', error);
        res.render('user/404Error')
    }
}



// Thank you page
const order_conform_page = async (req, res) => {
    console.log('conformation page rached --------->>   ');
    try {
        const userId = req.session.userId
        const deliveryCharge = 99;


        const orderConformation = await orderModel.findOne({ orderId: req.session.orderId }).populate({
            path: 'items.productId',
            select: 'name'
        })

        const cartItems = await cartModel.findOne({ userId: userId })

        // Calculate total cart value
        let Cart_total = 0;
        if (cartItems) {
            Cart_total = cartItems.items.reduce((total, item) => total + item.price, 0);
        }
        req.session.Cart_total = Cart_total;


        // checking cart count
        const result = await cartModel.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: '$item' },
            { $group: { _id: null, itemCount: { $sum: 1 } } },
        ])
        if (result.length > 0) {
            const itemCount = result[0].itemCount;
            req.session.cartCount = itemCount;
        }
        if (result.length === 0) {
            req.session.cartCount = 0;
        }

        Cart_total = req.session.Cart_total
        const itemCount = req.session.cartCount


        res.render('user/Thank_You', { order: orderConformation, Cart_total: Cart_total, itemCount: itemCount, deliveryCharge: deliveryCharge })
    } catch (error) {
        console.log('order_conform_page error undallo =====>>>> ', error);
        res.render('user/404Error')
    }
}


// Apply coupon
const applyCoupon = async (req, res) => {
    try {
        const { couponCode, subtotal } = req.body;
        const userId = req.session.userId;

        const coupon = await couponModel.findOne({ couponCode: couponCode });

        if (coupon && coupon.status === true) {
            const user = await userModel.findById(userId);

            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            // console.log("Coupon details:", coupon);
            // console.log("User details:", user);
            // console.log("Current date:", new Date());
            // console.log("Coupon expiry date:", coupon.expiry);
            // console.log("Coupon minimum price:", coupon.minimumPrice);
            // console.log("Subtotal:", subtotal);

            // Ensure subtotal is a number
            const numericSubtotal = typeof subtotal === 'string' ? parseFloat(subtotal.replace(/[^\d.-]/g, '')) : subtotal;

            console.log("Numeric Subtotal: --> ", numericSubtotal);

            if (user.usedCoupons && user.usedCoupons.includes(couponCode)) {
                res.json({ success: false, message: "Already Redeemed" });
            } else if (coupon.expiry > new Date() && coupon.minimumPrice <= numericSubtotal) {
                console.log("Coupon is valid");

                let dicprice;
                let price;

                if (coupon.type === "percentageDiscount") {
                    dicprice = (numericSubtotal * coupon.discount) / 100;
                    dicprice = Math.min(dicprice, coupon.maxRedeem);
                    price = numericSubtotal - dicprice;
                } else if (coupon.type === "flatDiscount") {
                    dicprice = coupon.discount;
                    price = numericSubtotal - dicprice;
                }

                await userModel.findByIdAndUpdate(
                    userId,
                    { $addToSet: { usedCoupons: couponCode } },
                    { new: true }
                );


                return res.json({ success: true, dicprice, price });
            } else {
                console.log("Invalid coupon conditions");
                res.json({ success: false, message: "Invalid Coupon" });
            }
        } else {
            console.log("Coupon not found or inactive");
            res.json({ success: false, message: "Coupon not found" });
        }
    } catch (err) {
        console.error("Error applying coupon:---------->>  ", err);
        res.render('user/404Error')
    }
};




// Revoke Coupon
const revokeCoupon = async (req, res) => {
    try {
        console.log('----------------------------> Revoke coupon reached --------->> ');

        const { couponCode, subtotal } = req.body;
        const userId = req.session.userId;
        const coupon = await couponModel.findOne({ couponCode: couponCode });

        const numericSubtotal = typeof subtotal === 'string' ? parseFloat(subtotal.replace(/[^\d.-]/g, '')) : subtotal;

        if (coupon) {
            const user = await userModel.findOne({ userId: userId });
            if (coupon.expiry > new Date() && coupon.minimumPrice <= numericSubtotal) {
                console.log("Coupon is valid");

                // Calculate the discount price
                const discountPrice = (numericSubtotal * coupon.discount) / 100;

                // Set discount price to 0 since the coupon is being revoked
                const dicprice = 0;

                // Include the delivery charge in the price
                const deliveryCharge = 99;
                const price = numericSubtotal + deliveryCharge;

                // Remove the coupon code from user's usedCoupons
                await userModel.findByIdAndUpdate(
                    userId,
                    { $pull: { usedCoupons: couponCode } },
                    { new: true }
                );

                // Send response with updated prices
                res.json({ success: true, dicprice, price, });

            } else {
                res.json({ success: false, message: "Invalid Coupon" });
            }
        } else {
            res.json({ success: false, message: "Coupon not found" });
        }
    } catch (error) {
        console.log('revock coupon undallo error ----------------->> ', error);
        res.render('user/404Error')
    }
};








module.exports = {
    checkout,
    order_post,
    order_conform_page,
    upi,
    applyCoupon,
    revokeCoupon,
    wallet
}