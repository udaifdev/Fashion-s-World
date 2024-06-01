const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema({
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        require : true
    },
    address : [{
        name : {
            type : String,
            require : true 
        },
        email : {
            type : String,
            require : true
        },
        mobile : {
            type : Number,
            require : true
        },
        housename : {
            type : String,
            require : true
        },
        street : {
            trype : String,
            require : true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        street: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        pincode: {
            type: String,
            required: true
        },
        save_as: {
            type: String,
            required: true
        },
    }]
})

const addressModel = new mongoose.model('address' , addressSchema)

module.exports = addressModel