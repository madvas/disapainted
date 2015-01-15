'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy
  , config = require('../config')
  , _ = require('lodash')
  , users = require('../../app/controllers/users.server.controller');

module.exports = function() {
  // Use twitter strategy
  passport.use(new TwitterStrategy({
      consumerKey       : config.twitter.clientID,
      consumerSecret    : config.twitter.clientSecret,
      callbackURL       : config.twitter.callbackURL,
      passReqToCallback : true
    },
    function(req, token, tokenSecret, profile, done) {
      // Set the provider data and include tokens
      var providerData = profile._json;
      providerData.token = token;
      providerData.tokenSecret = tokenSecret;

      // Create the user OAuth profile
      var providerUserProfile = {
        displayName     : profile.displayName,
        username        : profile.username,
        provider        : 'twitter',
        providerIdField : 'id_str',
        providerData    : _.pick(providerData, 'id_str', 'name', 'token', 'tokenSecret')
      };

      // Save the user OAuth profile
      users.saveOAuthUserProfile(req, providerUserProfile, done);
    }
  ));
};
