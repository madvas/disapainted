'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
  errHandler = require('../errors.server.controller'),
  mongoose = require('mongoose'),
  passport = require('passport'),
  User = mongoose.model('User');

exports.signup = function(req, res) {
  var user = new User(_.pick(req.body, 'username', 'email', 'password'));
  user.provider = 'local';
  user.save(function(err) {
    if (err) return res.status(400).send(errHandler.getErrMsg(err));
    user.password = undefined;
    user.salt = undefined;
    user.oldDBpassword = undefined;

    req.login(user, function(err) {
      if (err) return res.status(400).send(errHandler.getErrMsg(err));
      res.json(user);
    });
  });
};

exports.signin = function(req, res, next) {
  passport.authenticate('local', function(err, user) {
    if (err) return res.status(400).send(errHandler.getErrMsg(err));
    user.password = undefined;
    user.salt = undefined;
    user.oldDBpassword = undefined;

    req.login(user, function(err) {
      if (err) return res.status(400).send(errHandler.getErrMsg(err));
      res.json(user);
    });
  })(req, res, next);
};

exports.signout = function(req, res) {
  req.logout();
  res.redirect('/');
};

exports.oauthCallback = function(strategy) {
  return function(req, res, next) {
    passport.authenticate(strategy, function(err, user, redirectURL) {
      if (err || !user) {
        return res.redirect('/signin');
      }
      req.login(user, function(err) {
        if (err) {
          return res.redirect('/signin');
        }

        return res.redirect(redirectURL || '/');
      });
    })(req, res, next);
  };
};

exports.saveOAuthUserProfile = function(req, providerUser, done) {
  if (!req.user) {
    var searchMainProviderIdField, searchAdditionalProviderIdField, searchQuery
      , mainProviderQuery = {}
      , additionalProviderQuery = {};

    searchMainProviderIdField = 'providerData.' + providerUser.providerIdField;
    searchAdditionalProviderIdField = 'additionalProvidersData.' + providerUser.provider + '.' +
      providerUser.providerIdField;

    mainProviderQuery.provider = providerUser.provider;
    mainProviderQuery[searchMainProviderIdField] = providerUser.providerData[providerUser.providerIdField];

    additionalProviderQuery[searchAdditionalProviderIdField] = providerUser.providerData[providerUser.providerIdField];

    searchQuery = {
      $or : [mainProviderQuery, additionalProviderQuery]
    };

    if (providerUser.email) {
      searchQuery.$or.push({email : providerUser.email});
    }

    User.findOne(searchQuery, function(err, user) {
      if (err) {
        return done(err);
      } else {
        if (!user) {
          var possibleUsername = providerUser.username ||
            ((providerUser.email) ? providerUser.email.split('@')[0] : '');

          User.findUniqueUsername(possibleUsername, null, function(availableUsername) {
            user = new User({
              _id          : availableUsername,
              email        : providerUser.email,
              provider     : providerUser.provider,
              providerData : providerUser.providerData
            });

            // And save the user
            user.save(function(err) {
              return done(err, user);
            });
          });
        } else {
          return done(err, user);
        }
      }
    });
  } else {
    // User is already logged in, join the provider data to the existing user
    var user = req.user;

    if (user.provider !== providerUser.provider &&
      (!user.additionalProvidersData || !user.additionalProvidersData[providerUser.provider])) {
      // Add the provider data to the additional provider data field
      if (!user.additionalProvidersData) user.additionalProvidersData = {};
      user.additionalProvidersData[providerUser.provider] = providerUser.providerData;

      // Then tell mongoose that we've updated the additionalProvidersData field
      user.markModified('additionalProvidersData');

      // And save the user
      user.save(function(err) {
        return done(err, user, '/');
      });
    } else {
      return done(new Error('User is already connected using this provider'), user);
    }
  }
};

exports.removeOAuthProvider = function(req, res, next) {
  var user = req.user;
  var provider = req.param('provider');

  if (user && provider) {
    // Delete the additional provider
    if (user.additionalProvidersData[provider]) {
      delete user.additionalProvidersData[provider];

      // Then tell mongoose that we've updated the additionalProvidersData field
      user.markModified('additionalProvidersData');
    }

    user.save(function(err) {
      if (err) {
        return res.status(400).send(errHandler.getErrMsg(err));
      } else {
        req.login(user, function(err) {
          if (err) {
            res.status(400).send(err);
          } else {
            res.json(user);
          }
        });
      }
    });
  }
};
