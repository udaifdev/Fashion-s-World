 
 const mongoose = require('mongoose')
 const Schema = mongoose.Schema


const productSchema = new mongoose.Schema(
    {
        name : {
            type : String,
            require : true  
        },
        category : {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'categories',
            require : true
        },
        description : {
            type : String,
            require : true
        },
        price : {
            type : Number,
            require : true
        },
        discount: {
            type: Number,
            required: true
        },
        discountPrice: {
            type: Number,
            required: true
        },
        stock : [{
            size : {
                type : String,
                require : true
            },
            quantity : {
                type : Number,
                require : true
            }
        }],
        totalstock : {
            type : Number,
            require : true
        },
        image : {
            type : Array,
            require : true
        },
        status : {
            type : Boolean,
            default : true
        }
    }
)

const productModel = mongoose.model("productDetails", productSchema)

module.exports = productModel