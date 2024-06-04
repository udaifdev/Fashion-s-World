const categModel = require('../../model/catagoryModel')
const productModel = require('../../model/productModel')
const FavModel = require('../../model/FavModel')
const mongoose = require('mongoose');
const { products } = require('../adminController/productController');
const catgModel = require('../../model/catagoryModel');
const { category } = require('../adminController/categoryController');
const cartModel = require('../../model/cartModel');
const favModel = require('../../model/FavModel');



const shop = async (req,res) => {
    try {
        let products;
        const perPage = 6
        const id = req.session.userId
        const categoryId = req.query.category ; 
        const sortBy = req.query.sortBy
        const search = req.query.search 
        const page   = parseInt(req.query.page) || 1 ;

        if (search) {
            const searcRegex = new RegExp(search, 'i')
            let searchCriteria = { name : searcRegex , status : true}

            if (req.session.filterCat) {
                searchCriteria.category = new mongoose.Types.ObjectId(req.session.filterCat) ;
            }

            if (sortBy) {
                products = await getProductsWitSorting(searchCriteria , sortBy)
            } else {
                products = await productModel.find(searchCriteria).exec()
            }
            
        } else {
               if (sortBy) {
                   let filter = {status : true}
   
                   if (req.session.filterCat) {
                       filter.category = new mongoose.Types.ObjectId(req.session.filterCat);
                   }

                   products = await getProductsWitSorting(filter , sortBy)

               } else {
                    if (categoryId) {
                        products = await productModel.find({category : categoryId , status : true}).exec()
                        req.session.filterCat = categoryId
                    } else {
                    delete req.session.filter;
                    products = await productModel.find({status : true }).exec()
                    }
               }
            } 
          
        const totalPage = Math.ceil(products.length / perPage)
        const startIndex = (page - 1) * perPage
        const endIndex   = page * perPage
        const productPaginated = products.slice(startIndex , endIndex)

        const categoryCounts = await  categoryCount();
        const categories = await catgModel.find({status : true})
        const itemCount = req.session.cartCount
        const Cart_total = req.session.Cart_total

        res.render('user/shop', { products : productPaginated , categories , categoryCounts ,
                                  currentPage : page , totalPage , sortBy , categoryId , search , itemCount , Cart_total})
    
    } catch (error) {
        console.log("shop errro undallo ------------------>>    " + error);
        res.render('user/404Error')
    }
}


// sorting shop page
const getProductsWitSorting = async (filter,sortBy) => {
    const aggregationPipline = [];

    // Push the $match stage with the filter if it's provided
    if (filter) {
        aggregationPipline.push({ $match: filter } );
    }

    if (sortBy === 'nameAZ') {
        aggregationPipline.push(
            { $addFields: { name_lower: { $toLower: '$name' } } },
            { $sort: { name_lower: 1 } }
        );
    }
    if (sortBy === 'nameZA') {
        aggregationPipline.push(
            { $addFields: { name_lower: { $toLower: '$name' } } },
            { $sort: { name_lower: -1 } }
        );
    }    
    if (sortBy === 'priceHigh') {
        aggregationPipline.push({$sort : { price : 1 } } )
    }
    if (sortBy === 'priceLow') {
        aggregationPipline.push({$sort : { price : -1 } } )
    }
    if (sortBy === 'newArrivals') {
        aggregationPipline.push({$sort : {_id : -1} } , {$limit : 6})
    }

    // If the aggregation pipeline is empty, return all documents
    if (aggregationPipline.length === 0) {
        return productModel.find(filter).exec();
    }
    return productModel.aggregate(aggregationPipline).exec()
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
        const categories = await categModel.find();
        const productOne = await productModel.findById(productId);

        // Check if the request is for favicon
        if (req.url === '/favicon.ico') {
            return; // Ignore favicon requests
        }

        let pass = '';
        if (productOne.totalstock === 0) {
            pass = 'Out Of Stock!';
        }
        const products = await productModel.find({ category: productOne.category });

        // Ensure session variables exist before accessing them
        const itemCount = req.session.cartCount || 0;
        const Cart_total = req.session.Cart_total || 0;

        res.render('user/shopDetails', {
            productOne,
            products,
            categories,
            pass,
            itemCount,
            Cart_total
        });

    } catch (error) {
        console.log("single Product error: " + error);
        res.status(500).send("Internal Server Error");
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
            res.render('user/404Error')
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
        res.render('user/404Error')
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
        res.render('user/404Error')
    }
}








module.exports = { shop , singleProduct , viewFav , addtofavourites , remove_Fav }