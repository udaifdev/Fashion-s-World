const mongoose = require("mongoose")

const catgSchema = new mongoose.Schema(
    {
        name : {
            type : String,
            require : true
        },
        description : {
            type : String,
            require : true
        },
        discount : {
            type : Number,
            require : true
        },
        types : {
            type : Array,
            default : ['All']
        },
        status : {
            type : Boolean,
            require : true,
            default : true
        }
    }
)

const catgModel = mongoose.model("categories", catgSchema)

module.exports = catgModel