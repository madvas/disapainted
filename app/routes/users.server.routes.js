'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport');

module.exports = function(app) {
  // User Routes
  var users = require('../../app/controllers/users.server.controller'),
    core = require('../../app/controllers/core.server.controller');

  app.route('/users/:userId').post(users.requiresLogin, users.hasAuthorization, users.update);
  app.route('/users/accounts').delete(users.removeOAuthProvider);

  app.route('/users/:userId/password').post(users.requiresLogin, users.hasAuthorization, users.changePassword);
  app.route('/auth/forgot').post(users.forgot);
  app.route('/auth/reset/:token').get(users.validateResetToken);
  app.route('/auth/reset/:token').post(users.reset);

  app.route('/auth/signup').post(users.signup);
  app.route('/auth/signin').post(users.signin);
  app.route('/auth/signout').get(users.signout);

  app.route('/auth/facebook').get(passport.authenticate('facebook', {
    scope : ['email']
  }));
  app.route('/auth/facebook/callback').get(users.oauthCallback('facebook'));

  app.route('/auth/twitter').get(passport.authenticate('twitter'));
  app.route('/auth/twitter/callback').get(users.oauthCallback('twitter'));

  app.route('/auth/google').get(passport.authenticate('google', {
    scope : [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  }));
  app.route('/auth/google/callback').get(users.oauthCallback('google'));

  app.route('/auth/linkedin').get(passport.authenticate('linkedin'));
  app.route('/auth/linkedin/callback').get(users.oauthCallback('linkedin'));

  app.route('/auth/github').get(passport.authenticate('github'));
  app.route('/auth/github/callback').get(users.oauthCallback('github'));

  app.get('/users/:userId', users.info);
  app.get('/list/users/likes', core.limit, users.listUsersLikes);
  app.post('/users/:userId/portrait', users.requiresLogin, users.hasAuthorization, users.savePortrait);
  app.get('/users/:userId/unsubscribe/:token', users.userById, users.unsubscribe);
};
