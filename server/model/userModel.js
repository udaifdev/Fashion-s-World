const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
    {
        username : {
            type : String,
            require : true
        },
        email : {
            type : String,
            require : true,
            unique : true
        },
        phone : {
            type : String,
            require : true
        },
        password : {
            type : String,
            require : true
        },
        isAdmin : {
            type : Boolean,
            require : true,
            default : false
        },
        blocked : {
            type : Boolean,
            require : true,
            default : false
        },
        wallet : {
            type : Number,
            default : 0
        },
        usedCoupons :[{
            type : String
        }]

}
)

const userModel = new mongoose.model('userDetails', userSchema)

module.exports = userModel