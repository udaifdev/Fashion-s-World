const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const schema = new Schema({
    userId : {
        type : Schema.Types.ObjectId,
        ref : 'userDetails',
        require : true
    },
    items : [ 
        {
           productId : {
               type : Schema.Types.ObjectId,
               ref : 'productDetalis',
               require : true
           },
           stock : {
               type : Number , 
               require : true
           },
           quantity : {
               type : Number,
               require : true
           },
           size : {
               type : String,
               require : true
           },
           price : {
               type : Number,
               required : true
           },
           Product_total : {
               type : Number,
               require : true
           }
       }
   ] ,
     Cart_total : {
        type : Number,
        require : true
     }

} , {strictPopulate : false } )

const cartModel = mongoose.model('cart' , schema )


module.exports = cartModel ;