const productModel = require("../../model/productModel")
const path = require('path')
const fs = require("fs")
const sharp = require('sharp');
const { log } = require("console")
const catgModel = require("../../model/catagoryModel")


const products = async (req,res) => {
    try {
        const products = await productModel.find().populate({
            path : 'category',
            select : 'name'
        })
        res.render('admin/products' , {product : products})
    } catch (error) {
        console.log('products error undallo >>>>>' +error);
        res.render("admin/page-error-404")
    }
}

const addProduct = async (req,res) => {
    try {
        const categories = await catgModel.find({})
        res.render('admin/addProduct' , {category : categories})
    } catch (error) {
        console.log('add products error undallo' + error);
        res.render("admin/page-error-404")
    }
}

const addProductPost = async (req, res) => {
    try {
        const category = req.body.category;
        const categories = await catgModel.findById(category);
        const categoryDiscount = categories.discount;
        const price = parseFloat(req.body.price);
        let discount = parseFloat(req.body.discount);

        if (categoryDiscount > discount) {
            discount = categoryDiscount;
        }

        // Correctly calculate and round the discount price
        const discountPrice = Math.round(price * (1 - discount / 100));

        console.log('Discounted price:', discountPrice);

        const product = new productModel({
            name: req.body.name,
            category: category,
            description: req.body.description,
            price: price,
            discount: discount,
            discountPrice: discountPrice,
            stock: [
                {
                    size: 'XS',
                    quantity: parseInt(req.body.s1, 10),
                },
                {
                    size: 'S',
                    quantity: parseInt(req.body.s2, 10),
                },
                {
                    size: 'M',
                    quantity: parseInt(req.body.s3, 10),
                },
                {
                    size: 'L',
                    quantity: parseInt(req.body.s4, 10),
                },
                {
                    size: 'XL',
                    quantity: parseInt(req.body.s5, 10),
                }
            ],
            totalstock: parseInt(req.body.s1, 10) + parseInt(req.body.s2, 10) + parseInt(req.body.s3, 10) + parseInt(req.body.s4, 10) + parseInt(req.body.s5, 10),
            image: req.files.map((file) => file.path.replace(/\\/g, '/'))
        });

        await product.save();
        res.redirect('/admin/products');

    } catch (error) {
        console.log("Error adding product:", error);
        res.render("admin/page-error-404")
        res.status(500).send("An error occurred while adding the product.");
    }
};



const unlist = async (req,res) => {
    try {
        const id = req.params.id
        const product = await productModel.findById(id)
        product.status = !product.status
        await product.save()
        res.redirect('/admin/products')
    } catch (error) {
        console.log("unlist error undallo daa mone >>>>>>>  " + error);
        res.render("admin/page-error-404")
    }
}


const updateProduct = async (req,res) => {
    try {
        const id = req.params.id
        const product = await productModel.findById(id)
        res.render('admin/updateProduct' , { product })
    } catch (error) {
        console.log("update product error undallo >>>>>>>>>" + error);
        res.render("admin/page-error-404")
    }
}


const updateProductPost = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await productModel.findOne({ _id: id });
        const category = product.category;

        const categories = await catgModel.findById(category);
        const categoryDiscount = categories.discount;

        const price = parseFloat(req.body.price);
        let discount = parseFloat(req.body.discount);

        if (categoryDiscount > discount) {
            discount = categoryDiscount;
        }

        // Calculate and round the discount price correctly
        const discountPrice = Math.round(price * (1 - discount / 100));
        console.log('Discounted price:', discountPrice);

        // Update the product fields
        product.name = req.body.name;
        product.description = req.body.description;
        product.price = price;
        product.discount = discount;
        product.discountPrice = discountPrice;
        product.stock = [
            { size: 'XS', quantity: parseInt(req.body.s1, 10) },
            { size: 'S', quantity: parseInt(req.body.s2, 10) },
            { size: 'M', quantity: parseInt(req.body.s3, 10) },
            { size: 'L', quantity: parseInt(req.body.s4, 10) },
            { size: 'XL', quantity: parseInt(req.body.s5, 10) },
        ];
        product.totalstock = parseInt(req.body.s1, 10) + parseInt(req.body.s2, 10) +
                             parseInt(req.body.s3, 10) + parseInt(req.body.s4, 10) +
                             parseInt(req.body.s5, 10);

        await product.save();
        req.flash('updateSuccess', "Product Updated Successfully");
        res.redirect('/admin/products');

    } catch (error) {
        console.log('Update product post error:', error);
        res.status(500).send("An error occurred while updating the product.");
        res.render("admin/page-error-404")
    }
};



// edit image viwe page
const edit_img = async (req,res) => {
    try {
        const id = req.params.id ;
        const imageNotFound = req.flash('imageNotFound')
        const product = await productModel.findById(id)
        res.render('admin/Edit_Image' , {product : product , imageNotFound })
    } catch (error) {
        console.log("edit img problem undallo ----------->> " , error);
        res.render("admin/page-error-404")
    }
}



// Delete Image 
const Delete_img = async (req,res) => {
    try {
        const pid = req.query.pid ;
        const filename = req.query.filename ;

        if (filename) {
            try {
                await productModel.updateOne(
                    { _id : pid } ,
                    { $pull : { image : filename } }
                ) ;

                res.redirect('/admin/edit_img/' + pid) ;

            } catch (error) {
                console.log("error deleting image:- ----------\\---------\\--->>  ", error);
                res.status(500).send("Internal Server Error");
            }

        } else {
            req.flash('imageNotFound', "Image not found")
            res.redirect("/admin/edit_img/" + pid);
        }

    } catch (error) {
        console.log('Deleteing Image Error undallo ---------->  ' , error);
        res.render("admin/page-error-404")
    }
}

// Image updateing
const update_Image = async (req, res) => {
    try {
        const id = req.params.id;
        const new_img = req.files.map(file => file.path)
        const product = await productModel.findById(id)
        product.image.push(...new_img)

        product.save()
        res.redirect('/admin/updateProduct/' + id)

    } catch (err) {
        console.log('update Image error undallo ------------->>  ' , err);
        res.render("admin/page-error-404")
    }
}






module.exports = { 
     products ,
     addProduct ,
      addProductPost ,
       unlist ,
        updateProduct ,
         updateProductPost ,
          edit_img ,
           Delete_img , 
            update_Image
         }