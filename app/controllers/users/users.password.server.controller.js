'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash')
  , errHandler = require('../errors.server.controller')
  , mongoose = require('mongoose')
  , passport = require('passport')
  , User = mongoose.model('User')
  , config = require('../../../config/config')
  , nodemailer = require('nodemailer')
  , async = require('async')
  , crypto = require('crypto');

exports.forgot = function(req, res) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buffer) {
        var token = buffer.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({email : req.body.email}, '-salt -password -oldDBpassword', function(err, user) {
        if (!user) {
          return res.status(400).send({
            message : 'Sorry, no such email was registered on our site'
          });
        } else if (user.provider !== 'local') {
          return res.status(400).send({
            message : 'It seems like you signed up using your ' + user.provider + ' account'
          });
        } else {
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function(err) {
            done(err, token, user);
          });
        }
      });
    },
    function(token, user, done) {
      res.render('templates/reset-password-email', {
        name    : user._id,
        appName : config.app.title,
        url     : 'http://' + req.headers.host + '/api/auth/reset/' + token
      }, function(err, emailHTML) {
        done(err, emailHTML, user);
      });
    },
    function(emailHTML, user, done) {
      var smtpTransport = nodemailer.createTransport(config.mailer.options)
        , mailOptions = {
          to      : user.email,
          from    : config.mailer.from,
          subject : 'Password Reset',
          html    : emailHTML
        };
      smtpTransport.sendMail(mailOptions, done);
    }
  ], function(err) {
    if (err) return res.status(400).send(errHandler.getErrMsg(err));
    return res.status(200).end();
  });
};

exports.validateResetToken = function(req, res) {
  User.findOne({
    resetPasswordToken   : req.params.token,
    resetPasswordExpires : {
      $gt : Date.now()
    }
  }, function(err, user) {
    if (!user)  return res.redirect('/password/reset/invalid');
    res.redirect('/password/reset/' + req.params.token);
  });
};


exports.reset = function(req, res) {
  async.waterfall([
    function(next) {
      User.findOne({
        resetPasswordToken   : req.params.token,
        resetPasswordExpires : {
          $gt : Date.now()
        }
      }, function(err, user) {
        if (err || !user) return res.status(400).send({
          message : 'Password reset token is invalid or has expired.'
        });

        user.password = req.body.newPass;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err, user) {
          next(err, user);
        });
      });
    },
    function(user, done) {
      res.render('templates/reset-password-confirm-email', {
        name    : user._id,
        appName : config.app.title
      }, function(err, emailHTML) {
        done(err, emailHTML, user);
      });
    },
    function(emailHTML, user, done) {
      var smtpTransport = nodemailer.createTransport(config.mailer.options)
        , mailOptions = {
          to      : user.email,
          from    : config.mailer.from,
          subject : 'Your password has been changed',
          html    : emailHTML
        };

      smtpTransport.sendMail(mailOptions, done);
    }
  ], function(err) {
    if (err) return res.status(400).send(errHandler.getErrMsg(err));
    return res.status(200).end();
  });
};

exports.changePassword = function(req, res) {
  if (!req.user.authenticate(req.body.currentPass)) {
    res.status(400).send({
      message : 'Current password is incorrect'
    });
    return;
  }

  req.user.password = req.body.newPass;
  req.user.save(function(err) {
    if (err) return res.status(400).send(errHandler.getErrMsg(err));
    res.status(200).end();
  });
};
