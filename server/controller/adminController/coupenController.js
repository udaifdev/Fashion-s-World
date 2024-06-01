
const couponModel = require('../../model/coupenModel')
const flash = require('express-flash')




const coupen_view = async (req, res) => {
    try {
        const coupons = await couponModel.find({})
        const couponExists = req.flash('couponExists')
        res.render('admin/coupens' , { coupons , couponExists })
    } catch (error) {
        console.log('Coupen view error undallo ---------->>  ', error);
        res.render("admin/page-error-404")
    }
}


// Add Coupon 
const Add_Coupon = async (req, res) => {
    try {
        const couponExists = req.flash('couponExists')
        res.render('admin/AddCoupon', { couponExists })
    } catch (error) {
        res.render("admin/page-error-404")
    }
}


// coupon Post
const Coupon_Post = async (req, res) => {
    try {
        const { couponCode, minimumPrice, discount, expiry, maxRedeem, couponType } = req.body

        const couponExists = await couponModel.findOne({ couponCode: couponCode });

        if (couponExists) {
            req.flash('couponExists', "Coupon already exists")
            console.log("Coupon exists");
            res.redirect('/admin/add_coupon');
        }
        else {
            await couponModel.create({
                couponCode: couponCode,
                type: couponType,
                minimumPrice: minimumPrice,
                discount: discount,
                maxRedeem: maxRedeem,
                expiry: expiry
            })
            console.log("COUPON created");
            res.redirect('/admin/coupens');
        }
    } catch (error) {
        console.log(error);
        res.render("user/serverError");
        res.render("admin/page-error-404")
    }
}


// list and unlist 
const unlist_Coupon = async (req,res) => {
    try {
        const id = req.params.id
        const coupon = await couponModel.findOne({ _id : id });

        coupon.status = !coupon.status
        await coupon.save()

        res.redirect('/admin/coupens');

    } catch (error) {
        console.log("unlist coupon error undallo ---------->>  " , error);
        res.render("admin/page-error-404")
    }
}


// Edit coupon view 
const Edit_coupon_view = async (req,res) => {
    try {
        const id = req.params.id ;
        const coupon = await couponModel.findOne({_id : id})
        res.render('admin/editCoupon' , { coupon : coupon })
    } catch (error) {
        console.log("coupon view error undallo admin side ------------->>  " , error);
        res.render("admin/page-error-404")
    }
}


// Edit coupon Post 
const update_Coupon_Post = async (req, res) => {
    try {
        const { couponId, couponCode, minimumPrice, discount, expiry, maxRedeem, couponType } = req.body;
        const couponExists = await couponModel.findOne({ couponCode: couponCode });

        if (couponExists && couponExists._id.toString() !== couponId) {
            req.flash('couponExists', "Coupon already exists");
            return res.redirect('/admin/coupons');
        }

        const updateFields = {
            couponCode: couponCode,
            type: couponType,
            minimumPrice: minimumPrice,
            discount: discount,
            expiry: expiry,
        };

        if (couponType === 'flatDiscount') {
            updateFields.maxRedeem = discount; // For flatDiscount, maxRedeem is the same as discount
        } else {
            updateFields.maxRedeem = maxRedeem; // For percentageDiscount, use the provided maxRedeem
        }

        await couponModel.findByIdAndUpdate(couponId, { $set: updateFields });

        console.log("Coupon updated successfully!");
        res.redirect('/admin/coupens');
    } catch (err) {
        console.error("Error updating coupon:", err);
        res.render("admin/page-error-404");
    }
};




module.exports = { coupen_view , Add_Coupon , Coupon_Post , unlist_Coupon , Edit_coupon_view , update_Coupon_Post }