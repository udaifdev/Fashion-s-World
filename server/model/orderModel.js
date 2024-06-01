const mongoose = require('mongoose')
const shortid = require('shortid');
// const { schema, castObject } = require('./catagoryModel');
const { create } = require('hbs');
const Schema = mongoose.Schema


const schema = new mongoose.Schema({
    userId : {
        type : Schema.Types.ObjectId,
        ref  : 'userDetails',
    },
     orderId : {
        type : String,
        default : shortid.generate,
        unique : true, 
    },
    items : [{
        productId : {
            type : Schema.Types.ObjectId,
            ref  : 'productDetails',
        },
        quantity : {
            type : Number,
            required : true,
        },
        size : {
            type : String,
            required : true
        },
        price : {
            type : Number,
            required : true
        },
    }],
    wallet : {
        type : Number,
    },
    status : {
        type : String,
        default : 'pending',
        require :  true 
    },
    address : {
        type : Array,
        require : true
    },
    amount : {
        type : Number,
        require : true
    },
    payment : {
        type : String,
        require : true
    },
    createdAt : {
        type : Date,
        require : true
    },
    updated : {
        type : Date,
        require : true
    },
    return : [{
        reason : {
            type : String
        },
        status : {
            type : String,
            default : 'pending'
        }
    }]
})
 

const orderModel = new mongoose.model( 'order', schema )

module.exports = orderModel