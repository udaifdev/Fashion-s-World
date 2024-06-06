const orderModel = require('../../model/orderModel')
const walletModel = require('../../model/walletModel')
const productModel = require('../../model/productModel')
const userModel = require('../../model/userModel')


const order = async (req, res) => {
    try {
        const search=req.query.search;
        let order;

        if(search){
            order=await orderModel.find({
                orderId: { $regex: new RegExp(`^${search}`, `i`) },
            })
        }else{
            order = await orderModel.find({}).sort({ createdAt: -1 }).populate({
                path: 'items.productId',
                select: 'name'
            })
        }
        
        res.render('admin/orders', { order: order })
    } catch (error) {
        console.log('order error undallo >>>>>>>>>>  ' + error)
        res.render("admin/page-error-404")
    }
}


const view_order_details = async (req, res) => {
    try {
        const id = req.params.id;
        const order = await orderModel.findOne({ _id: id }).populate({
            path: 'items.productId',
            select: 'name image discount',

        });

        res.render('admin/viewOrders', { order });
    } catch (error) {
        console.log('view order details admin error undallo -------------->> ', error);
        res.render("admin/page-error-404");
    }
}



const status = async (req, res) => {
    console.log('status reached --------->>>>>>>>>>> ');
    try {
        const { orderId, status } = req.body
        const updateOrder = await orderModel.updateOne({ _id: orderId }, { status: status, updated: new Date() })
        console.log('reched ------>>>>>>>> ', updateOrder);

        res.redirect('/admin/orders')

    } catch (error) {
        console.log(' admin status error undallo --------->>  ', error);
        res.render("admin/page-error-404")
    }
}


//  Return Order Page view 
const return_order_view = async (req, res) => {
    try {
        const order = await orderModel.find({ 'return': { $exists: true, $ne: [] } }).sort({ createAt: -1 }).populate({
            path: 'items.productId',
            select: 'name'
        })
        res.render('admin/Order_Return', { order: order })
    } catch (error) {
        console.log("return order view error undallo ----------->>  ", error);
        res.render("admin/page-error-404")
    }
}


// Return Accepct 
const return_Approved = async (req, res) => {
    try {
        const orderId = req.params.id;
        const update = await orderModel.updateOne(
            { _id: orderId, 'return.status': 'Pending' },
            { $set: { status: 'returned', updated: new Date(), 'return.$.status': 'Accepted' } }
        );
        const order = await orderModel.findOne({ _id: orderId })
        const userId = order.userId;
        const user = await userModel.findOne({ _id: userId })
        user.wallet += order.amount
        await user.save()

        const wallet = await walletModel.findOne({ userId: userId })
        if (!wallet) {
            const newWallet = new walletModel({
                userId: userId,
                history: [
                    {
                        transaction: "Credited",
                        amount: order.amount,
                        date: new Date(),
                        reason: "Order Returned"
                    }
                ]
            })
            await newWallet.save();
        } else {
            wallet.history.push({
                transaction: "Credited",
                amount: order.amount,
                date: new Date(),
                reason: "Order Returned"
            })
            await wallet.save();
        }

        const items = order.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,

        }))
        for (const item of items) {
            const product = await productModel.findOne({ _id: item.productId })

            const size = product.stock.findIndex(size => size.size == item.size)
            product.stock[size].quantity += item.quantity
            product.totalstock += item.quantity
            await product.save()
        }

        res.redirect('/admin/Order_Return');
    } catch (error) {
        console.log("return approved error undallo ------------>   ", error);
        res.render("admin/page-error-404")
    }
}


// Reject Return order
const return_Reject = async (req, res) => {
    try {
        const orderId = req.params.id;
        const update = await orderModel.updateOne(
            { _id: orderId, 'return.status': 'Pending' },
            { $set: { 'return.$.status': 'Rejected' } }
        );
        res.redirect('/admin/Order_Return');
    } catch (error) {
        console.log('return reject error undallo -------->>   ', error);
        res.render("admin/page-error-404")
    }
}




module.exports = { order, status, return_order_view, return_Approved,  return_Reject, view_order_details }