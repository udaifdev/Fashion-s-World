const categModel = require('../../model/catagoryModel')
const productModel = require('../../model/productModel')
const FavModel = require('../../model/FavModel')
const mongoose = require('mongoose');
const { products } = require('../adminController/productController');
const catgModel = require('../../model/catagoryModel');
const { category } = require('../adminController/categoryController');
const cartModel = require('../../model/cartModel');
const favModel = require('../../model/FavModel');



const shop = async (req, res) => {
    try {
        const perPage = 6;
        const categoryId = req.query.category;
        const sortBy = req.query.sortBy;
        const search = req.query.search;
        const page = parseInt(req.query.page) || 1;

        let searchCriteria = { status: true };

        // Build the search criteria
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            searchCriteria.name = searchRegex;
        }

        // Category filtering
        if (categoryId) {
            searchCriteria.category = new mongoose.Types.ObjectId(categoryId);
            req.session.filterCat = categoryId;
        } else if (req.session.filterCat) {
            searchCriteria.category = new mongoose.Types.ObjectId(req.session.filterCat);
        }

        // Fetch products with sorting and pagination
        const products = await getProductsWithSortingAndPagination(searchCriteria, sortBy, page, perPage);
        const totalProducts = await productModel.countDocuments(searchCriteria);
        const totalPage = Math.ceil(totalProducts / perPage);

        // Fetch other necessary data
        const categoryCounts = await categoryCount();
        const categories = await catgModel.find({ status: true });
        const itemCount = req.session.cartCount;
        const Cart_total = req.session.Cart_total;

        // Construct query parameters for pagination links
        const queryParams = new URLSearchParams({ 
            category: categoryId || '',
            sortBy: sortBy || '',
            search: search || ''
        });

        res.render('user/shop', {
            products,
            categories,
            categoryCounts,
            currentPage: page,
            totalPage,
            sortBy,
            categoryId,
            search,
            itemCount,
            Cart_total,
            queryParams: queryParams.toString()
        });

    } catch (error) {
        console.log("shop error ------------------>>    " + error);
    }
};

// Function to handle sorting and pagination
const getProductsWithSortingAndPagination = async (filter, sortBy, page, perPage) => {
    const aggregationPipeline = [];

    // Add match stage with filter criteria
    if (filter) {
        aggregationPipeline.push({ $match: filter });
    }

    // Add sorting stage based on sortBy parameter
    if (sortBy) {
        switch (sortBy) {
            case 'nameAZ':
                aggregationPipeline.push(
                    { $addFields: { name_lower: { $toLower: '$name' } } },
                    { $sort: { name_lower: 1 } }
                );
                break;
            case 'nameZA':
                aggregationPipeline.push(
                    { $addFields: { name_lower: { $toLower: '$name' } } },
                    { $sort: { name_lower: -1 } }
                );
                break;
            case 'priceHigh':
                aggregationPipeline.push({ $sort: { price: 1 } });
                break;
            case 'priceLow':
                aggregationPipeline.push({ $sort: { price: -1 } });
                break;
            case 'newArrivals':
                aggregationPipeline.push({ $sort: { _id: -1 } });
                break;
            default:
                break;
        }
    }

    // Add pagination stages
    aggregationPipeline.push(
        { $skip: (page - 1) * perPage },
        { $limit: perPage }
    );

    // Execute the aggregation pipeline
    return productModel.aggregate(aggregationPipeline).exec();
}



// Category count function 
const categoryCount = async (req,res) => {

    const aggregationPipline = [
        { $match : {status:true}},
        { $group : {_id : '$category',count: {$sum:1} } }
    ]

    const categoryCount = await productModel.aggregate(aggregationPipline)
    const categoryCountMap = { }

    categoryCount.forEach(count => {
        categoryCountMap[count._id] = count.count;
    })

    return categoryCountMap
}



// Single prooduct viewing 
const singleProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error(' Single Product Invalid Product ID ------------>> ');
        }

        const categories = await categModel.find();
        const productOne = await productModel.findById(productId);

        if (!productOne) {
            throw new Error('Product not found');
        }

        // Check if the request is for favicon
        if (req.url === '/favicon.ico') {
            return; // Ignore favicon requests
        }

        let pass;
        if (productOne.totalstock === 0) {
            pass = 'Out Of Stock!';
        }

        const products = await productModel.find({ category: productOne.category });

        const itemCount = req.session.cartCount;
        const Cart_total = req.session.Cart_total;
        res.render('user/shopDetails', {
            productOne,
            products,
            categories,
            pass,
            itemCount,
            Cart_total
        });

    } catch (error) {
        console.log("single Product error undallo --------------->>  " + error.message);
        res.status(500).send('An error occurred while fetching the product details.');
    }
}


const addtofavourites = async (req,res) => {
    try {
        console.log('add to favourites reache ----------> 1');
        const size = req.query.size ;
        const pid = req.params.id ;
        // const price = req.params.price
        const userId = req.session.userId ;
        const price = req.body.discountPrice
            
        console.log('price  ==> 2 ' , price );
        
        let fav = await favModel.findOne({ userId : userId })
        console.log('fav ------------->  3   ' , fav);

        if (!fav) {
            fav = new favModel({
                userId : userId ,
                items   : [{
                    productId : pid ,
                    size : size ,
                    price: price // Inserting price here
                }]
            })
        } else {

            const existingProduct = fav.items.findIndex(item => item.productId.toString() === pid && item.size !== size)
            if (existingProduct === -1) {
                fav.items.push({ productId : pid , size : size, price: price }) ;
            } else {
                fav.items[existingProduct].size = size ;
                fav.items[existingProduct].price = price; // Updating price here
            }
            console.log('existingProduct -----------> 4   ' , existingProduct);
        }

         
        await fav.save()
        res.redirect('/wishlisht')

    } catch (error) {
        console.log('add to favourites error undallo ------------!  ' , error);
    }
}


 
const viewFav = async (req,res) => {
    try {
        const userId = req.session.userId ; 
        const fav = await favModel.findOne({ userId : userId}).populate({
            path : 'items.productId',
            selected : '_id name image size price'
        })

        const itemCount = req.session.cartCount ;
        const Cart_total = req.session.Cart_total

        res.render('user/wishlisht' , {fav : fav , itemCount , Cart_total} )
    } catch (error) {
        console.log('view fav error undallo check aakiko -------------!  ' , error);
    }
}


const remove_Fav = async (req,res) => {
    try {
        const userId = req.session.userId ;
        const productId_remove = req.params.id
        
        const result = await favModel.updateOne(
            { userId : userId },
            { $pull : {items : {productId : productId_remove } } }
        )
        res.redirect('/wishlisht')
    } catch (error) {
        console.log('remove Fav error undallo poi check chiyyuga ______! ' , error);
    }
}








module.exports = { shop , singleProduct , viewFav , addtofavourites , remove_Fav }