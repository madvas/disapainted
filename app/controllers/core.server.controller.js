'use strict';

var config = require('../../config/config')
  , nodemailer = require('nodemailer');

exports.index = function(req, res) {
  res.render('index', {
    user    : req.user || null,
    request : req
  });
};

exports.limit = function(req, res, next) {
  req.query.limit = parseInt(req.query.limit);
  if (req.query.limit > 30) next('Limit parameter is too big');
  next();
};

exports.contact = function(req, res) {
  if (req.body.message.length >= config.users.contact.msgLen ||
    req.body.subject.length >= config.users.contact.subjLen) return res.status(400).end();

  var smtpTransport = nodemailer.createTransport(config.mailer.options)
    , mailOptions = {
      to      : config.users.contact.email,
      from    : config.mailer.from,
      subject : req.body.subject,
      html    : req.body.email + ': ' + req.body.message
    };
  smtpTransport.sendMail(mailOptions, function(err) {
    if (err) return res.status(400).send({message : 'Sorry, message could not be sent'});
    res.status(200).end();
  });
};
