'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  User = require('mongoose').model('User');

module.exports = function() {
  // Use local strategy
  passport.use(new LocalStrategy({
      usernameField : 'username',
      passwordField : 'password'
    },
    function(username, password, done) {
      var criteria = (username.indexOf('@') === -1) ? {_id : username} : {email : username};
      User.findOne(criteria, function(err, user) {
        if (err) return done(err);
        if (!user || !user.authenticate(password)) {
          return done({
            message : 'Hmm, it seems like these credentials are invalid'
          }, false);
        }

        return done(null, user);
      });
    }
  ));
};
