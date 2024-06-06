
const fs = require('fs')
const path = require('path')
const adminModel = require('../../model/userModel')
const bcrypt = require("bcrypt")
const flash = require("express-flash")
const easyinvoice = require('easyinvoice')
const exceljs = require('exceljs')
const { log } = require('console')
const orderModel = require('../../model/orderModel')
const catgModel = require('../../model/catagoryModel')



const login = (req, res) => {
    try {
        if (req.session.isAdAuth) {
            return res.redirect('/admin/adminIndex')
        } else {
            res.render('admin/adminlogin', { passwordError: req.query.passwordError })
        }
    } catch (error) {
        console.log("login error undallo" + error);
        res.render("admin/page-error-404")
    }
}

const loginPost = async (req, res) => {
    try {
        const password = req.body.password
        const user = await adminModel.findOne({ email: req.body.email });
        console.log("user ========>>>>>>>>>  ", req.body);
        if (user.isAdmin == true && await bcrypt.compare(password, user.password)) {
            req.session.isAdAuth = true;
            res.redirect('/admin/adminIndex')
        } else {
            console.log("redirect avnilla loginpost admin >>>>>>>>>");
            res.redirect('/admin?passwordError=Invaild%20password%2Fusername')
        }

    } catch (error) {
        console.log("login-Post-error-undallo >>>>>>>>" + error);
        res.render("admin/page-error-404")
    }
}



const adLogout = (req, res) => {
    try {
        req.session.isAdAuth = false
        res.redirect('/admin')
    } catch (error) {
        console.log("adLogoutl error undallo >>>>>>>>>.");
    }
}


const user = async (req, res) => {
    try {
        const user = await adminModel.find({})
        res.render("admin/users", { users: user })
    } catch (error) {
        console.log("user error undallo..>>>>>>>" + error);
        res.render("admin/page-error-404")
    }
}


// user block  and unblock 
const unblock = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await adminModel.findById(id)
        const newValue = !user.blocked;
        await adminModel.updateOne({ _id: id }, { $set: { blocked: newValue } })
        req.session.isAuth = false
        res.redirect('/admin/users')
    } catch (error) {
        console.log("unblockill error undallo..>>>>>" + error);
        res.render("admin/page-error-404")
    }
}


// Search 
const search_user_post = async (req, res) => {
    try {
        const searchName = req.body.search;
        const data = await adminModel.find({
            username: { $regex: new RegExp(`^${searchName}`, `i`) },
        });
        req.session.searchUser = data;
        res.redirect('/admin/searchView')
    } catch (err) {
        console.log(err);
        res.render("user/serverError");
    }
}

const search_user_View = async (req, res) => {
    try {
        const user = req.session.searchUser;
        res.render('admin/users', { users: user })
    } catch (err) {
        console.log(err);
        res.render("user/serverError");
    }
}



// DashBoard Report 
const adminPanel = async (req, res) => {
    try {

        const totalDiscountSumResult = await orderModel.aggregate([
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'productdetails',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetailses'
                }
            },
            { $unwind: '$productDetailses' },
            {
                $group: {
                    _id: null,
                    totalDiscountSum: {
                        $sum: {
                            $multiply: [
                                { $multiply: ['$items.quantity', '$productDetailses.price'] },
                                { $divide: ['$productDetailses.discount', 100] }
                            ]
                        }
                    }
                }
            }]);

        const totalDiscountSum = totalDiscountSumResult.length > 0 ? Math.round(totalDiscountSumResult[0].totalDiscountSum) : 0

        const orders = await orderModel.aggregate([
            { $match: { status: { $nin: ['Cancelled', 'returned'] } } },
            { $group: { _id: null, totalOrders: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
        ]);


        const flashMessages = req.flash();

        res.render('admin/adminIndex', { flashMessages, orders, totalDiscountSum });

    } catch (error) {
        console.log('admin Report Error undallo ----------->>  ', error);
        res.render("admin/page-error-404")
    }
};



// Function 
const isFutureDate = (selectedDate) => {
    try {
        const selectedDateTime = new Date(selectedDate);
        const currentDate = new Date();
        return selectedDateTime >= currentDate;

    } catch (error) {
        console.log("is futuredate error undalloe -------> ", error);
        res.render("users/serverError")
    }
}



// Download Sales
const downloadsales = async (req, res) => {
    try {
        console.log("download sale reached -------------||");

        const { startDate, endDate, submitBtn } = req.body;

        // Validate dates
        if (!startDate || !endDate) {
            req.flash('derror', 'Choose a date');
            return res.redirect('/admin/adminIndex');
        }
        if (isFutureDate(startDate) || isFutureDate(endDate)) {
            req.flash('derror', 'Invalid date');
            return res.redirect('/admin/adminIndex');
        }

        console.log("startDate:", startDate, "endDate:", endDate);
        console.log("Parsed startDate:", new Date(startDate), "Parsed endDate:", new Date(endDate));

        // Adjust end date to include the whole day
        const endDatePlusOne = new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1));

        const salesData = await orderModel.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lt: endDatePlusOne,
                    },
                    status: {
                        $nin: ["Cancelled", "returned"]
                    }
                },
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                },
            },
        ]);

        console.log('sale data :: ----------->>', salesData);

        if (salesData.length === 0) {
            req.flash('derror', 'No sales data found for the selected dates');
            return res.redirect('/admin/adminIndex');
        }

        const products = await orderModel.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lt: endDatePlusOne,
                    },
                },
            },
            {
                $unwind: '$items',
            },
            {
                $lookup: {
                    from: 'productdetails',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetailses',
                },
            },
            {
                $unwind: '$productDetailses',
            },
            {
                $group: {
                    _id: '$items.productId',
                    productPrice: { $first: '$productDetailses.discountPrice' },
                    totalSold: { $sum: '$items.quantity' },
                    totalPrice: { $sum: { $multiply: ['$items.quantity', '$productDetailses.price'] } },
                    totalDiscountPercent: { $first: '$productDetailses.discount' },
                    productName: { $first: '$productDetailses.name' },
                },
            },
            {
                $addFields: {
                    totalDiscount: { $multiply: ['$totalPrice', { $divide: ['$totalDiscountPercent', 100] }] }
                },
            },
            {
                $sort: { totalSold: -1 },
            },
        ]);

        console.log('products yoyo :: ----------->>', products);

        if (submitBtn === 'pdf') {
            if (!salesData.length || !products.length) {
                throw new Error('Sales data is missing or incomplete.');
            }

            const pdfBuffer = await generateInvoice(salesData, products);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report-${new Date().toISOString().split('T')[0]}.pdf`);
            res.send(pdfBuffer);
        } else {
            const totalAmount = salesData[0]?.totalAmount || 0;
            const workbook = new exceljs.Workbook();
            const sheet = workbook.addWorksheet("Sales Report");

            sheet.columns = [
                { header: "Sl No", key: "slNo", width: 10 },
                { header: "Product Name", key: "productName", width: 25 },
                { header: "Quantity Sold", key: "productQuantity", width: 15 },
                { header: "Total Price", key: "productTotal", width: 15 },
                { header: "Discount(%)", key: "totalDiscountPercent", width: 15 },
                { header: "Total Discount Amount", key: "totalDiscount", width: 20 }
            ];

            products.forEach((item, index) => {
                sheet.addRow({
                    slNo: index + 1,
                    productName: item.productName,
                    productQuantity: item.totalSold,
                    productTotal: item.totalPrice,
                    totalDiscountPercent: `${item.totalDiscountPercent}%`,
                    totalDiscount: item.totalDiscount
                });
            });

            console.log('end reached ------------>');

            sheet.addRow({});
            sheet.addRow({ productName: 'Total No of Orders', productQuantity: salesData[0]?.totalOrders || 0 });
            sheet.addRow({ productName: 'Total Revenue', productQuantity: totalAmount });

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", "attachment;filename=report.xlsx");

            await workbook.xlsx.write(res);
        }
    } catch (error) {
        console.error("download sales error ---------->>", error);
        req.flash('derror', 'Error generating report. Please try again.');
        res.redirect('/admin/adminIndex');
        res.render("admin/page-error-404")
    }
};



// Function
const generateInvoice = async (salesData, products) => {
    try {
        if (!salesData || salesData.length === 0 || !salesData[0].totalAmount) {
            throw new Error("Sales data is missing or incomplete.");
        }
        let totalAmount = salesData[0].totalAmount;
        const data = {
            currency: 'INR',
            marginTop: 25,
            marginRight: 25,
            marginLeft: 25,
            marginBottom: 25,
            images: {
                //set the logo
                logo: "",
            },
            sender: {
                company: 'Male Fashions',
                address: 'HSR Layout Sector 2, Somasundarapalya , Banglore, India',
                zip: '455433',
                city: 'Banglore',
                country: 'INDIA',
                phone: '8867148072',
                email: 'malefashion@gmil.com',
                website: 'www.malefashion.com',
            },
            invoiceNumber: `report-${new Date().toISOString().split('T')[0]}`,
            invoiceDate: new Date().toJSON(),
            products: products.map(item => ({
                quantity: item.totalSold,
                description: item.productName,
                price: item.productPrice,
            })),
            totalAmount: `₹${totalAmount.toFixed(2)}`,
            tax: 0,
            bottomNotice: 'Male Fashion!',
        };

        const result = await easyinvoice.createInvoice(data);
        const pdfBuffer = Buffer.from(result.pdf, 'base64');
        return pdfBuffer;
    } catch (error) {
        console.log('generator invoice function error undallo ---------> ', error);
        res.render("admin/page-error-404")
    }
};


// Selling Report 
const best_product = async (req, res) => {
    try {
        const bestProducts = await orderModel.aggregate([
            {
                $unwind: '$items'
            },
            {
                $group: {
                    _id: '$items.productId',
                    totalSold: { $sum: '$items.quantity' }
                }
            },
            {
                $lookup: {
                    from: 'productdetails',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$productDetails'
            },
            {
                $lookup: {
                    from: 'categorydetails',
                    localField: 'productDetails.categoryId',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            {
                $unwind: {
                    path: '$categoryDetails',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    totalSold: 1,
                    productName: '$productDetails.name',
                    productCategory: '$categoryDetails.name', // Fixed projection for category name
                    productImage: '$productDetails.image',
                    stockLeft: '$productDetails.totalstock'
                }
            },
            {
                $sort: { totalSold: -1 }
            },
            {
                $limit: 10
            }
        ]);

        const bestCategories = await orderModel.aggregate([
            {
                $unwind: '$items',
            },
            {
                $lookup: {
                    from: 'productdetails',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetails',
                },
            },
            {
                $unwind: '$productDetails',
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productDetails.category',
                    foreignField: '_id',
                    as: 'categoryDetails',
                },
            },
            {
                $unwind: '$categoryDetails',
            },
            {
                $group: {
                    _id: '$categoryDetails.name',
                    totalSold: { $sum: '$items.quantity' },
                    numProducts: { $addToSet: '$productDetails._id' },
                },
            },
            {
                $project: {
                    _id: 1,
                    totalSold: 1,
                    numProducts: { $size: '$numProducts' },
                },
            },
            {
                $sort: { totalSold: -1 },
            },
            {
                $limit: 10,
            },
        ]);

        console.log('best product in orders ----------->>   ', bestProducts);
        res.render('admin/SellingReport', { bestProducts, bestCategories })
    } catch (error) {
        console.log('best product error undallo ------------->>  ', error);
        res.render("admin/page-error-404")
    }
}



// Chart Data 
const chartData = async (req, res) => {
    try {
        const selected = req.body.selected;
        
        if (selected === 'month') {
            // Aggregate by month
            const orderByMonth = await orderModel.aggregate([
                {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                        },
                        count: { $sum: 1 },
                    }
                }
            ]);
            const salesByMonth = await orderModel.aggregate([
                {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                        },
                        totalAmount: { $sum: '$amount' },
                    }
                }
            ]);
            const responseData = {
                order: orderByMonth,
                sales: salesByMonth
            };
            res.status(200).json(responseData);

        } else if (selected === 'year') {
            // Aggregate by year
            const orderByYear = await orderModel.aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                        },
                        count: { $sum: 1 },
                    }
                }
            ]);
            const salesByYear = await orderModel.aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                        },
                        totalAmount: { $sum: '$amount' },
                    }
                }
            ]);
            const responseData = {
                order: orderByYear,
                sales: salesByYear,
            };
            res.status(200).json(responseData);

        } else if (selected === 'week') {
            // Aggregate by week
            const orderByWeek = await orderModel.aggregate([
                {
                    $group: {
                        _id: {
                            week: { $isoWeek: '$createdAt' },
                        },
                        count: { $sum: 1 },
                    }
                }
            ]);
            const salesByWeek = await orderModel.aggregate([
                {
                    $group: {
                        _id: {
                            week: { $isoWeek: '$createdAt' },
                        },
                        totalAmount: { $sum: '$amount' },
                    }
                }
            ]);
            const responseData = {
                order: orderByWeek,
                sales: salesByWeek,
            };
            res.status(200).json(responseData);
        }

    } catch (err) {
        console.log('chart data error undallo --------------------->>  ', err);
        res.render("admin/page-error-404");
    }
}




// Generate Sales Report Displaying
const Generate_sales_Report = async (req, res) => {
    try {
        console.log("Generate sale report reached -------------||");

        const perPage = 5;
        const page = parseInt(req.query.page) || 1;

        const { startDate, endDate } = req.body;

        // Validate dates
        if (!startDate || !endDate) {
            req.flash('derror', 'Choose a date');
            return res.redirect('/admin/OrderReport');
        }
        if (isFutureDate(startDate) || isFutureDate(endDate)) {
            req.flash('derror', 'Invalid date');
            return res.redirect('/admin/OrderReport');
        }

        console.log("startDate:", startDate, "endDate:", endDate);
        console.log("Parsed startDate:", new Date(startDate), "Parsed endDate:", new Date(endDate));

        // Adjust end date to include the whole day
        const endDatePlusOne = new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1));

        // Fetch sales data
        const salesData = await orderModel.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lt: endDatePlusOne,
                    },
                    status: {
                        $nin: ["Cancelled", "returned"]
                    }
                },
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                },
            },
        ]);

        console.log('sale data :: ----------->>', salesData);

        if (salesData.length === 0) {
            req.flash('derror', 'No orders found for the selected dates');
            return res.redirect('/admin/OrderReport');
        }

        // Fetch product details
        const products = await orderModel.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lt: endDatePlusOne,
                    },
                    'items.productId': { $exists: true } // Ensure items.productId exists
                },
            },
            {
                $unwind: '$items',
            },
            {
                $lookup: {
                    from: 'productdetails',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetailses',
                },
            },
            {
                $unwind: '$productDetailses',
            },
            {
                $group: {
                    _id: '$items.productId',
                    productPrice: { $first: '$productDetailses.discountPrice' },
                    totalSold: { $sum: '$items.quantity' },
                    totalPrice: { $sum: { $multiply: ['$items.quantity', '$productDetailses.price'] } },
                    totalDiscountPercent: { $first: '$productDetailses.discount' },
                    productName: { $first: '$productDetailses.name' },
                    productImage: { $first: '$productDetailses.image' }, // Include product image
                },
            },
            {
                $addFields: {
                    totalDiscount: {
                        $round: {
                            $multiply: ['$totalPrice', { $divide: ['$totalDiscountPercent', 100] }],
                        },
                    },
                },
            },
            {
                $sort: { totalSold: -1 },
            },
        ]);

        console.log("products ------------->>", products);

        const orders = await orderModel.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lt: endDatePlusOne,
                    },
                    status: {
                        $nin: ['Cancelled', 'returned']
                    }
                }
            },
            { 
                $group: { 
                    _id: null, 
                    totalOrders: { $sum: 1 }, 
                    totalAmount: { $sum: '$amount' } 
                }
            }
        ]);

        console.log("orders ------------->>", orders);

        // Calculate total discount sum and round it
        let totalDiscountSum = 0;
        products.forEach(product => {
            totalDiscountSum += product.totalDiscount;
        });
        totalDiscountSum = Math.round(totalDiscountSum); // Round the total discount sum

        const totalPages = Math.ceil(products.length / perPage);
        const startIndex = (page - 1) * perPage;
        const endIndex = perPage * page;
        const productPaginated = products.slice(startIndex, endIndex);

        res.render('admin/ReportOrders', {
            flashMessages: req.flash(), // Pass flash messages to the view
            startDate,
            endDate,
            salesData: salesData[0], // Since salesData is an array with one object
            products: productPaginated,
            currentPage: page,
            totalPages, 
            orders: orders, // Since orders is an array with one object
            totalDiscountSum, // Pass totalDiscountSum to the view
        });

    } catch (error) {
        console.error("Download sales error ---------->>", error);
        req.flash('derror', 'Error generating report. Please try again.');
        res.redirect('/admin/OrderReport');
    }
};






// Order selling Report 
const order_selling = async (req, res) => {
    try {
        const perPage = 5;
        const page = parseInt(req.query.page) || 1;

        const products = await orderModel.aggregate([
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'productdetails',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetailses'
                }
            },
            { $unwind: '$productDetailses' },
            {
                $group: {
                    _id: '$items.productId',
                    totalSold: { $sum: '$items.quantity' },
                    totalPrice: { $sum: { $multiply: ['$items.quantity', '$productDetailses.price'] } },
                    totalDiscountPercent: { $first: '$productDetailses.discount' },
                    productName: { $first: '$productDetailses.name' },
                    productImage: { $first: '$productDetailses.image' },
                }
            },
            {
                $addFields: {
                    totalDiscountPercent: { $toDouble: '$totalDiscountPercent' },
                    totalDiscount: {
                        $round: [
                            { $multiply: ['$totalPrice', { $divide: ['$totalDiscountPercent', 100] }] }, 0
                        ]
                    }
                }
            },
            { $sort: { totalSold: -1 } },
        ]);

        let totalDiscountSum = 0;

        products.forEach(product => {
            totalDiscountSum += product.totalDiscount;
        });

        const orders = await orderModel.aggregate([
            { $match: { status: { $nin: ['Cancelled', 'returned'] } } },
            { $group: { _id: null, totalOrders: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
        ]);

        const totalPages = Math.ceil(products.length / perPage);
        const startIndex = (page - 1) * perPage;
        const endIndex = perPage * page;
        const productPaginated = products.slice(startIndex, endIndex);

        res.render('admin/ReportOrders', {
            flashMessages: req.flash(), // Pass flash messages to the view
            products: productPaginated,
             
            currentPage: page,
            totalPages,
            orders
        });
    } catch (error) {
        console.log('order selling error undallo ------------>>   ', error);
        req.flash('derror', 'Error generating report. Please try again.');
        res.redirect('/admin/page-error-404');
    }
};








module.exports = { login, loginPost, adLogout, adminPanel, user, unblock, downloadsales, best_product, chartData, order_selling, Generate_sales_Report, search_user_View, search_user_post }