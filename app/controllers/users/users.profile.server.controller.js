'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash')
  , errHandler = require('../errors.server.controller')
  , mongoose = require('mongoose')
  , passport = require('passport')
  , config = require('../../../config/config')
  , fs = require('fs')
  , base64resize = require('base64resize')
  , User = mongoose.model('User');

exports.update = function(req, res) {
  req.user.set('email', req.body.email);
  req.user.set('bio', req.body.bio);

  req.user.save(function(err) {
    if (err) return res.status(400).send(errHandler.getErrMsg(err));
    res.status(200).end();
  });
};


exports.info = function(req, res) {
  User.findById(req.params.userId, config.users.listFields, function(err, user) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    if (!user) return res.status(400).json({message : 'I failed to load user ' + req.params.userId});
    return res.status(200).json(user);
  });
};

exports.listUsersLikes = function(req, res) {
  User.paginate({}, req.query.page, req.query.limit, function(err, pageCount, users) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    return res.status(200).json({meta : {pageCount : pageCount}, list : users});
  }, {
    columns : config.users.listFields,
    sortBy  : '-likesCount'
  });
};


exports.savePortrait = function(req, res) {
  var errors;
  req.checkBody('portrait', 'Invalid portrait data').isBase64();
  errors = req.validationErrors();
  if (errors) return res.status(400).end();
  base64resize({
    src    : 'data:image/png;base64,' + req.body.portrait,
    dst    : config.users.portraits.dir + req.user._id + '.png',
    width  : config.users.portraits.width,
    height : config.users.portraits.height
  }, function(err) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    res.status(200).end();
  });
};
