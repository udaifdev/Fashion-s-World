const catgModel = require('../../model/catagoryModel')
const { render } = require('ejs')
const productModel = require('../../model/productModel')



const category = async (req, res) => {
    try {
        const updateSuccess = req.flash("update Success")
        const catSuccess = req.flash("catg  Success")
        const categories = await catgModel.find({})
        res.render('admin/categories', { category: categories, catSuccess, updateSuccess })

    } catch (error) {
        console.log("category error undallo mone..>>>>>>>" + error);
        res.render('admin/page-error-404')
    }
}



const addCategory = async (req, res) => {
    try {
        const catError = req.flash('catError')
        res.render('admin/addCategories', { catError })
    } catch (error) {
        console.log("add Category error undallo >>>>>" + error);
        res.render('admin/page-error-404')
    }
}



const addCategoryPost = async (req, res) => {
    try {
        const catgName = req.body.name
        const catgDescription = req.body.description
        const discount = req.body.discount
        const catgExist = await catgModel.findOne({ name: { $regex: new RegExp("^" + catgName + "$", "i") } })

        if (catgExist) {
            // console.log("Already Existed >>>>>>>>>>");
            req.flash('catError', "Already Exists in Category")
            return res.redirect('/admin/addCategories')
        } else {
            await catgModel.create({ name: catgName, description: catgDescription, discount: discount })
            req.flash('catSuccess', "Category Added Succsussfully")
            res.redirect('/admin/categories')
        }
    } catch (error) {
        console.log("add category post error aahnallo" + error);
        res.render('admin/page-error-404')
    }
}



const unlist = async (req, res) => {
    try {
        const id = req.params.id
        const category = await catgModel.findById(id)
        category.status = !category.status;
        await category.save()
        res.redirect('/admin/categories')
    } catch (error) {
        console.log("unlistl error undallo..>>>>>>" + error);
        res.render('admin/page-error-404')
    }
}



const updateCategory = async (req, res) => {
    try {
        const id = req.params.id
        const category = await catgModel.findById(id)
        const catError = req.flash('catError');
        res.render('admin/UpdateCategory', { category, catError })
    } catch (error) {
        console.log("update category error undallo >>>>>>>>" + error);
        res.render('admin/page-error-404')
    }
}


const updateCategoryPost = async (req, res) => {
    try {
        const id = req.params.id
        // console.log(id, '-------------------------')
        const category = await catgModel.findById({ _id: id })
        const product = await productModel.find({ category: id });
        const catName = req.body.name
        const NameWasModified = catName !== category.name

        if (NameWasModified) {
            const catgExist = await catgModel.findOne({ name: { $regex: new RegExp("^" + catName + "$", "i") } });
            if (catgExist) {
                console.log('Already Existed ! >>>>>>>>>>>>>>>>>>>>>>');
                req.flash('catError', 'Category Already Existed');
                return res.redirect(`/admin/UpdateCategory/${id}`);
            }
        }
        
        category.description = req.body.description
        category.discount = req.body.discount
        category.name = catName
        await category.save()
        const categoriesDiscount = category.discount;
        product.forEach(async (element) => {
            if (categoriesDiscount > element.discount) {
                element.discount = categoriesDiscount
            }
            element.discountPrice = element.price - (element.price * (element.discount / 100))
            await element.save()
        })
        // console.log(categoriesDiscount);
        req.flash('updateSuccess', "Category Updated Successfully");
        res.redirect('/admin/categories')
    } catch (error) {
        console.log('update category post error undallo..>>>>>>' + error);
        res.render("admin/page-error-404")
    }
}





module.exports = { category, addCategory, addCategoryPost, unlist, updateCategory, updateCategoryPost }