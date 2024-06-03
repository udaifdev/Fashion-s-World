const express = require("express")
require('dotenv').config();
const session = require("express-session")
const mongoose = require("mongoose")
const userRouter = require("./server/routers/user")
const adminRouter = require("./server/routers/admin")
const nocache = require("nocache")
const flash = require("express-flash")
const path = require("path")
const { readFile } = require("fs")
const app = express()
const multer = require('multer')
const passport = require('passport')
app.use(express.json())

mongoose.connect(process.env.MONGO_URL).then(() => {
    console.log("MONGO-DB Connected >>>>>>>>>>>>>>");
}).catch((error) => {
    console.log(error);
})

app.use(flash())
app.use(express.urlencoded({ extended: true }))
app.use("/public", express.static(path.join(__dirname, 'public')))

app.use("/uploads", express.static(path.join(__dirname, 'uploads')))
app.use(express.static(__dirname + "/public"))
console.log(__dirname, '>>>>>>>>>')
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.set('Views', path.join(__dirname, 'Views'));

// view engine 
app.set("view engine", "ejs");

app.use(flash())
// use nocache
app.use(nocache());
app.use(session({
    secret: "sss3434545234343434lf34534a345sdfasdf",
    resave: false,
    saveUninitialized: true,
})
)

app.use(passport.initialize());
app.use(passport.session())

// Multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})

const upload = multer({ storage: storage })

// Pass the upload middleware to the routers
app.use((req, res, next) => {
    req.upload = upload;
    next();
})

// router connecting
app.use("/admin", adminRouter)
app.use("/", userRouter)

app.get("*", (req, res) => {
    res.status(404).render("admin/page-error-404")
})

// Port server
app.listen(2020, () => {
    console.log("Server Is Running At http://localhost:2020");
})
