const passport = require('passport')
const userModel = require('./server/model/userModel')

const GoogleStrategy = require('passport-google-oauth2').Strategy;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "https://shop.fashionworld.cloud/google/callback",
  passReqToCallback: true
},

  async function (request, accessToken, refreshToken, profile, done) {
    try {
      let user = await userModel.findOneAndUpdate(
        { email: profile.emails[0].value },
        {
          $set: {
            username: profile.displayName,
          }
        },
        { upsert: true, new: true }
      );
      return done(null, user);

    } catch (error) {
      console.log('.env error undallo  --------------->  ' + error)
      return done(error)
    }
  }
));


passport.serializeUser(function (user, done) {
  done(null, user);
})

passport.deserializeUser(function (user, done) {
  done(null, user);
})