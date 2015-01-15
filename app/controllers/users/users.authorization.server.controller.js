'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash')
  , mongoose = require('mongoose')
  , User = mongoose.model('User');

exports.requiresLogin = function(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).end();
  }
  next();
};

exports.hasAuthorization = function(req, res, next) {
  if (req.params.userId !== req.user._id) {
    return next(new Error('Attempt for unauthorized access to user profile ' + req.user.id));
  }
  return next();
};
