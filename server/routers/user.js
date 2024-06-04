const express = require("express")
require('../../googleAuth')
const passport = require('passport')
const userRouter = express.Router()
const userController = require("../controller/userController/userController")
const productController = require('../controller/userController/productController')
const profileController = require('../controller/userController/profileController')
const cartController = require('../controller/userController/cartController')
const checkoutController = require('../controller/userController/checkoutController')
const session = require("../../middleware/userAuth")
const { signed , ifLogged , Logged , checkoutValid } = session



userRouter.get('/googleSignIn', userController.googleSignIn)
userRouter.get('/auth/google/callback', userController.googleCallback);
userRouter.get('/auth/failure', userController.authFailure);


userRouter.get("/" , userController.index)
userRouter.get('/profile' , Logged , userController.profile)
userRouter.get('/contact' , userController.contact)


userRouter.get("/login" , ifLogged , userController.login)
userRouter.get("/signup" , ifLogged , userController.signup)
userRouter.post("/login" , userController.loginPost)
userRouter.get('/logout' , userController.logout)
userRouter.post("/signup" , userController.signupPost)


userRouter.post("/verifyotp" , userController.verifyotp)
userRouter.get("/otp", signed , userController.otp)
userRouter.post("/resendotp" , userController.resendotp)
 

userRouter.get('/ChangePass' , Logged , profileController.Reset_pass)
userRouter.post('/passwordUpdating' , Logged , profileController.Reset_Pass_Post)


userRouter.get('/move/address' , Logged , profileController.viewAddress)
userRouter.get('/addAddress' , Logged , profileController.addAddress)
userRouter.post('/addressPost' , Logged , profileController.addAddressPost)
userRouter.post('/addressUpdated/:id' , Logged , profileController.editPost)
userRouter.get('/deleteAddress/:id' , Logged , profileController.deleteAddress)
userRouter.get("/editAddress/:id" , Logged , profileController.editAddress)


userRouter.get('/orders' , Logged , profileController.order_show)
userRouter.get('/order-tracking/:id' , Logged , profileController.order_tracking)
userRouter.get('/itemCancel/:orderId/:productId', Logged , profileController.itemCancel)
userRouter.get('/cancelorder/:id' , Logged , profileController.order_Cancelling)
userRouter.post('/Return_Reason' ,  profileController.Return_Reason )
userRouter.get('/coupons' , Logged , profileController.coupons )
userRouter.post('/reOrder/:id' , Logged , profileController.reOrder )
userRouter.get('/downloadInvoice/:id' , Logged , profileController.downloadInvoice)


userRouter.post('/walletTopup', profileController.walletTopup)
userRouter.post('/walletcreate/orderId', profileController.walletupi)
userRouter.get('/wallet' , Logged , profileController.wallet )


userRouter.get('/cart' , Logged , cartController.view_Cart)
userRouter.post('/add-to-cart/:id', Logged , cartController.add_cart_post)
userRouter.get('/product-remove-cart/:id/:size' , Logged , cartController.Product_Remove )
userRouter.post('/updateCartQuantity/:productId/:size' , Logged , cartController.updateQtys)


userRouter.get('/wishlisht' , Logged , productController.viewFav)
userRouter.get('/addtofavourites/:id/' , Logged , productController.addtofavourites)
userRouter.get('/removefromfavorites/:id' , Logged , productController.remove_Fav)


userRouter.get('/checkout' , Logged , checkoutValid ,   checkoutController.checkout )
userRouter.post('/order' , Logged , checkoutValid ,  checkoutController.order_post )
userRouter.post('/create/orderId' , Logged , checkoutValid , checkoutController.upi)
userRouter.post("/applyCoupon", Logged , checkoutValid , checkoutController.applyCoupon)
userRouter.post("/revokeCoupon", Logged , checkoutValid ,  checkoutController.revokeCoupon)
userRouter.post('/wallettransaction', Logged, checkoutController.wallet)
userRouter.get('/orderCornformPage' , Logged , checkoutValid , checkoutController.order_conform_page)


 


userRouter.get('/shop' , productController.shop)
userRouter.get('/singleproduct/:id' , productController.singleProduct)
 

 


module.exports = userRouter