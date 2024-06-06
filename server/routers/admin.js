const express = require("express")
const adminRouter = express.Router()
const adminController = require("../controller/adminController/adminController")
const categoryController = require("../controller/adminController/categoryController")
const productController = require('../controller/adminController/productController')
const orderController = require('../controller/adminController/orderController')
const coupenController = require('../controller/adminController/coupenController')
const session = require('../../middleware/adminAuth')
const multer = require('multer');


adminRouter.use(express.urlencoded({ extended: true }))



adminRouter.get("/", session.adLogout, adminController.login)
adminRouter.post("/adminlogin", adminController.loginPost)
adminRouter.get('/adminIndex', session.adAuth, adminController.adminPanel)


adminRouter.get('/users', session.adAuth, adminController.user)
adminRouter.get('/unblock/:id', session.adAuth, adminController.unblock)


adminRouter.get('/products', session.adAuth, productController.products)
adminRouter.get('/addProduct', session.adAuth, productController.addProduct)
adminRouter.get('/unlist/:id', session.adAuth, productController.unlist)
adminRouter.get('/updateProduct/:id', session.adAuth, productController.updateProduct)
adminRouter.post('/updateProduct/:id', session.adAuth, productController.updateProductPost)
adminRouter.get('/edit_img/:id', session.adAuth, productController.edit_img)
adminRouter.get('/Delete_img', session.adAuth, productController.Delete_img)
adminRouter.post('/addProduct', session.adAuth, (req, res, next) => req.upload.array('images', 5)(req, res, next), productController.addProductPost);
adminRouter.post('/updateImage/:id', session.adAuth, (req, res, next) => req.upload.single('image')(req, res, next), productController.update_Image);


adminRouter.get('/categories', session.adAuth, categoryController.category)
adminRouter.get('/addCategories', session.adAuth, categoryController.addCategory)
adminRouter.post("/addCategories", session.adAuth, categoryController.addCategoryPost)
adminRouter.get('/unlistCat/:id', session.adAuth, categoryController.unlist)
adminRouter.get('/UpdateCategory/:id', session.adAuth, categoryController.updateCategory)
adminRouter.post('/UpdateCategory/:id', session.adAuth, categoryController.updateCategoryPost)


adminRouter.get('/orders', session.adAuth, orderController.order)
adminRouter.post('/updateOrderStatus', session.adAuth, orderController.status)
adminRouter.get('/Order_Return', session.adAuth, orderController.return_order_view)
adminRouter.get('/returnApprove/:id', session.adAuth, orderController.return_Approved)
adminRouter.get('/returnReject/:id', session.adAuth, orderController.return_Reject)
adminRouter.get('/viewOrder/:id', session.adAuth, orderController.view_order_details)


adminRouter.get('/coupens', session.adAuth, coupenController.coupen_view)
adminRouter.get('/newcoupon', session.adAuth, coupenController.Add_Coupon)
adminRouter.post('/add_coupon_Post', session.adAuth, coupenController.Coupon_Post)
adminRouter.get('/unlistCoupon/:id', session.adAuth, coupenController.unlist_Coupon)
adminRouter.get('/editCouponGet/:id', session.adAuth, coupenController.Edit_coupon_view)
adminRouter.post('/updateCoupon', session.adAuth, coupenController.update_Coupon_Post)


adminRouter.post('/downloadsales', session.adAuth, adminController.downloadsales)
adminRouter.post('/GenerateReport', session.adAuth, adminController.Generate_sales_Report)
adminRouter.post('/chartData', session.adAuth, adminController.chartData)
adminRouter.get('/SellingReport', session.adAuth, adminController.best_product)
adminRouter.get('/OrderReport', session.adAuth, adminController.order_selling)

    

adminRouter.get('/adLogout', session.adAuth, adminController.adLogout)

module.exports = adminRouter