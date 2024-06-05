
const productModel = require('../../model/productModel')
const cartModel = require('../../model/cartModel')
const mongoose = require('mongoose')
const flash = require('express-flash')



// Cart Page Getting
const view_Cart = async (req, res) => {
    try {
        const userId = req.session.userId;
        const sessionId = req.session.id;
        req.session.checkout = true;

        const cart = await cartModel.findOne({ userId: userId });

        // console.log("cart items ---->>   ", cart);

        if (cart) {
            const productIdS = cart.items.map(product => product.productId);
            const products = await productModel.find({ _id: { $in: productIdS } });

            const enrichedCartData = cart.items.map(cartProduct => {
                const productId = cartProduct.productId.toString();
                const product = products.find(P => P._id.toString() === productId);
                return {
                    ...cartProduct,
                    name: product ? product.name : 'Product Not Found',
                    price: product.discountPrice,
                    image: product && product.image.length > 0 ? product.image[0] : '',
                    size: cartProduct.size
                };
            });

            const Cart_total = enrichedCartData.reduce((total, item) => {
                return total + (item._doc.price * item._doc.quantity);
            }, 0);

            // Update session data
            req.session.Cart_total = Cart_total;
            req.session.cartItems = enrichedCartData;

            // Update cart count in session
            const itemCount = enrichedCartData.length;
            req.session.cartCount = itemCount;

            const nostock = req.flash('nostock');

            res.render('user/Cart', {
                cart: cart,
                itemCount: itemCount,
                Cart_total: Cart_total,
                nostock: nostock,
                cartItems: enrichedCartData
            });

        } else {
            // If cart is not found, set itemCount and Cart_total to 0
            const itemCount = 0;
            const Cart_total = 0;
            req.session.cartCount = itemCount;
            req.session.Cart_total = Cart_total;
            req.session.cartItems = []; // Empty cart items array
            res.render("user/Cart", { cart: cart, itemCount: itemCount, Cart_total: Cart_total });
        }
    } catch (error) {
        console.log('view cart page error:------->>  ', error);
        res.render('user/404Error')
    }
}




// Add To Cart Post 
const add_cart_post = async (req, res) => {
    try {
        const userId = req.session.userId;
        const product_Id = req.params.id;
        const { size } = req.body;
        const price = parseFloat(req.body.price.trim());
        const discountPrice = parseFloat(req.body.discountPrice.trim());

        console.log('userid -> ', userId, ' product Id -> ', product_Id, ' size ->  ', size, ' price -> ', price, "discount_price ->  ", discountPrice);

        if (!userId || !product_Id || !size || isNaN(price) || isNaN(discountPrice)) {
            throw new Error('Invalid Input');
        }

        const [cart, product] = await Promise.all([
            cartModel.findOne({ userId: userId }),
            productModel.findOne({ _id: product_Id })
        ]);

        if (!product) {
            throw new Error('Product not found');
        }

        const quantity = 1;

        if (!cart) {
            // Create a new cart
            const new_cart = await cartModel.create({
                userId: userId,
                items: [{
                    productId: product_Id,
                    quantity: quantity,
                    size: size,
                    price: discountPrice,
                    Product_total: quantity * discountPrice,
                }],
                Cart_total: quantity * discountPrice
            });
            res.redirect('/cart');
        } else {
            // Cart exists & check for product and stock
            const check_stock = product.stock.find(s => s.size === size);
            const product_Index_size = cart.items.findIndex(p => p.productId.equals(product_Id) && p.size === size);

            if (!check_stock || check_stock.quantity < 1) {
                // Item out of stock
                console.log('-------- it is out of stock ---------');
                return res.status(404).redirect('/shop');
            }

            if (product_Index_size !== -1) {
                // Product with the same size exists in the cart, increment quantity
                const existingItem = cart.items[product_Index_size];
                existingItem.quantity += quantity;
                existingItem.Product_total += discountPrice;

                cart.Cart_total += discountPrice;

                await cart.save();

                console.log('incremented product quantity in the cart & updating finished !!!!');
            } else {
                // Adding new item in the cart
                const new_cart_item = {
                    productId: product_Id,
                    quantity: quantity,
                    size: size,
                    price: discountPrice,
                    Product_total: quantity * discountPrice,
                };

                cart.items.push(new_cart_item);
                cart.Cart_total += discountPrice;
                await cart.save();

                console.log('added new item to the cart & updating finished !!!!');
            }
            res.redirect('/cart');
        }
    } catch (error) {
        console.log("add cart post error-------------->  ", error);
        res.render('user/404Error')
    }
};



// Remove Product Cart 
const Product_Remove = async (req, res) => {
    try {
        const userId = req.session.userId
        const cart_item_id = req.params.id
        const size = req.params.size

        console.log(`user-id ${userId} product-id ${cart_item_id} poduct-size ${size}`);

        const result = await cartModel.updateOne({ userId: userId }, { $pull: { items: { _id: cart_item_id, size: size } } })

        const updateCart = await cartModel.findOne({ userId: userId })
        const newTotal = updateCart.items.reduce((acc, item) => acc + item.Product_total, 0)

        updateCart.Cart_total = newTotal;
        await updateCart.save()

        res.status(200).redirect('/cart')
    } catch (error) {
        console.log("Product Remove error undallo ..........................  ", error);
        res.render('user/404Error')
    }

}



// Quentities incrimenting 
const updateQtys = async (req, res) => {
    try {
        const { productId, size } = req.params;
        const { action, cartId } = req.body;

        const cart = await cartModel.findOne({ _id: cartId });
        const itemIndex = cart.items.findIndex(item => item._id == productId && item.size == size);

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, error: 'Item not found in cart' });
        }

        const currentQuantity = cart.items[itemIndex].quantity;
        const stockLimit = cart.items[itemIndex].stock;
        const price = cart.items[itemIndex].price;
        const opid = cart.items[itemIndex].productId;
        const product = await productModel.findOne({ _id: opid });
        const selectedInfo = product.stock.findIndex((stock) => stock.size == size);
        const stockLimit2 = product.stock[selectedInfo].quantity;

        let updatedQuantity;

        if (action == '1') {
            updatedQuantity = currentQuantity + 1;
        } else if (action == '-1') {
            updatedQuantity = currentQuantity - 1;
        } else {
            return res.status(400).json({ success: false, error: "Invalid action!!" });
        }

        if (updatedQuantity > stockLimit2 && action == '1') {
            return res
                .status(400)
                .json({ success: false, error: "Quantity exceeds stock limits" });
        } else if (updatedQuantity == 0) {
            return res
                .status(400)
                .json({ success: false, error: "Quantity cannot be zero" });
        }

        cart.items[itemIndex].quantity = updatedQuantity;

        const newProductTotal = price * updatedQuantity;
        cart.items[itemIndex].Product_total = newProductTotal;

        // Update Cart_total
        cart.Cart_total = cart.items.reduce((total, item) => total + item.Product_total, 0);
        console.log('cart ile cart Total ----------->>  ', cart.Cart_total);

        await cart.save();

        // Update the session cart total
        req.session.Cart_total = cart.Cart_total;

        res.json({
            success: true,
            newQuantity: updatedQuantity,
            newProductTotal,
            total: cart.Cart_total,
        });

    } catch (error) {
        console.error("updateCart error:-------------->>  ", error);
        res.render('user/404Error')
    }
}







module.exports = { view_Cart, add_cart_post, Product_Remove, updateQtys }