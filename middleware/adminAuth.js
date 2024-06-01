
const adAuth = (req,res,next) => {
    try {
        if (req.session.isAdAuth) {
            next()
        } else {
            res.redirect('/admin')
        }
    } catch (error) {
        res.render("admin/page-error-404")
        console.log("adAuth middleware error undallo" +error );
    }
}

const adLogout = (req,res,next) => {
    try {
        if (req.session.isAdAuth) {
            res.redirect('/admin/adminIndex')
        } else {
            next()
        }
    } catch (error) {
        console.log("error undallo adLogout middlwarel" + error);
        res.render('admin/page-error-404')
    }
}



module.exports = { adLogout , adAuth }