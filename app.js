require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocal = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.set("view engine", "ejs");

app.use(express.urlencoded({
    extended: true
}));
app.use(express.static("public"));
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));


app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/theusersDB", {
    useNewUrlParser: true
});

const userSchema = new mongoose.Schema({
    username: String,
    firstname: String,
    lastname: String,
    email: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser((user, done) => {
    done(null, user.id)
});
passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user)
    });
});



passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/products"
    },
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });

    }
));

app.get("/", (req, res) => {
    
    res.render("register")
    
});

app.get("/login", (req, res) => {
    
    res.render("login")
    
});

app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile']
    }));

app.get('/auth/google/products',
    passport.authenticate('google', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/products');
    });

app.get("/products", (req, res) => {
    
    if (req.isAuthenticated()) {
        res.render("products");
    } else {
        res.redirect("/login")
    }
    
});

app.get("/logout", (req, res) => {
    
    req.logOut();
    res.redirect('/')
    
});


app.post("/", (req, res) => {

    User.register({
        username: req.body.username,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email
    }, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect("/");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect('/products');
            });
        }
    });

});

app.post("/login", (req, res) => {
    
    const user = new User({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password
    });

    req.login(user, (err) => {
        if (err) {
            console.log(err);
            res.redirect('/login')
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect('/products')
            });
        }
    });
    
});


app.listen(3000, () => {
    console.log("Server running on port 3000...");
});
