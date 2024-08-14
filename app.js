if(process.env.NODE_ENV != "production")
{
    require('dotenv').config();
}

// console.log(process.env.SECRET)  
const express = require('express');
const app = express();
const port = 8080;
const mongoose = require('mongoose');
// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const path = require("path"); 
const methodOverride = require('method-override'); 
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js"); 
const flash =  require('connect-flash');
const session  = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require("passport");
const localStrategy = require('passport-local');
const User = require('./models/user.js');
// const mongoStore = require('passport-local-mongoose');

const dbUrl = process.env.ATLASDB_URL;

// const Listing = require("./models/listing.js");
// const wrapAsync = require("./utils/wrapAsync.js");
// const {listingSchema, reviewSchema} = require("./schema.js");
// const Review = require("./models/review.js");
// const review = require('./models/review.js');

const listingsRouter = require('./routes/listing.js')
const reviewsRouter = require('./routes/review.js');
const userRouter = require('./routes/user.js');

main().then(() => {
    console.log("connected to DB");
})
.catch((err) => {
    console.log(err); 
});

async function main() {
    await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public"))); 


const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("ERORR in MONGO SESSION STORE", err);
}); 
 
const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, //for a week
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true, 
    }
}

// app.get("/", (req, res) => {
//     console.log("working GREAT")
// });
 

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser()); //stores information of the user
passport.deserializeUser(User.deserializeUser()); //when the user ends the session we need to deserialized it

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// app.get("/demouser", async (req, res) => {
//     let fakeUser = new User({
//         email: "dora@gmail.com",
//         username: "dora",        
//     });

//     let registerUser = await User.register(fakeUser, "fakeUser");
//     res.send(registerUser);
// });

//these are parent routes
app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", userRouter);


// app.post("/listings", wrapAsync(async (req, res, next) => {
//     // let {title, description, image, price, country, location} = req.body; 
//         const listing = req.body.listing;
//         if(!listing)
//         {
//             throw new ExpressError(400, "Send valid data for listing") //400 - bad request from client side
//         }
//         const newListing = new Listing(listing);
//         if(!newListing.description) {
//             throw new ExpressError(400, "Description is missing") //400 - bad request from client side
//         }
//         if(!newListing.title) {
//             throw new ExpressError(400, "Title is missing") //400 - bad request from client side
//         }
//         if(!newListing.price) {
//             throw new ExpressError(400, "Price is missing") //400 - bad request from client side
//         }
//         await newListing.save();
//         res.redirect("/listings");  
//   }));


 
// update
// app.put("/listings/:id/", 
//     validateListing,
//     wrapAsync(async (req, res) => {
//     let {id} = req.params;
//     await Listing.findByIdAndUpdate(id, {...req.body.listing});
//     res.redirect(`/listings/${id}`);
// }));





// app.get("/testing", async (req, res) => {
//     let sampleListing = new Listing({
//         title: "New Villa",
//         description: "by the beach",
//         price: 2,
//         location: "Mumbai",
//         country: "India",
//     });
//     await sampleListing.save();
//     console.log("sample was saved");
//     res.send("successful testing");
// }); 

// app.use((err, req, res,  next) =>{
//     res.send("something went wrong");
// })

//when a request is made and it does not match with any of the route then we can send a standard error 
app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page not found!"));
}); 

app.use((err, req, res, next) => {
    const {statusCode=500, message = " Something went wrong"} = err;
    res.status(statusCode).render("error.ejs", {err});
    // res.status(statusCode).send(message);
});

// app.use((err, req, res, next) =>{
//     const {statusCode=500, message = " Something went wrong"} = err;
//     res.status(statusCode).render("error.ejs", {statusCode, message});
// });
  

app.listen(port, () => {
    console.log("server is listening on port 8080");
});