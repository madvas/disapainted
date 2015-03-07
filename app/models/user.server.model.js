'use strict';

var mongoose = require('mongoose')
  , validate = require('mongoose-validator')
  , uniqueValidatorPlugin = require('mongoose-unique-validator')
  , paginatePlugin = require('mongoose-paginate')
  , Schema = mongoose.Schema
  , config = require('../../config/config')
  , validator = require('validator')
  , crypto = require('crypto');


var usernameValidator = [
  validate({
    validator : 'isLength',
    arguments : [2, 25],
    message   : 'Name should be between 2 and 25 characters'
  }),
  validate({
    validator : 'matches',
    arguments : /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))$/,
    message   : 'Incorrect username format'
  })
];

var passwordValidator = [
  function(password) {
    return (this.provider !== 'local' || ((password && password.length >= 6) || this.oldDBpassword.length));
  },
  'Passwords should be at least 6 characters long'
];

var emailValidator = [
  function(email) {
    if (this.provider !== 'local' && !email) {
      return true;
    }
    return validator.isEmail(email);
  },
  'Email address isn\'t correct'
];

var bioValidator = [
  validate({
    validator : 'isLength',
    arguments : [0, config.users.maxBioLength],
    message   : 'Bio can be up to ' + config.users.maxBioLength + ' characters'
  })
];


var UserSchema = new Schema({
  _id                     : {
    type     : String,
    trim     : true,
    validate : usernameValidator,
    required : true,
    unique   : true
  },
  email                   : {
    type     : String,
    required : false,
    validate : emailValidator,
    unique   : true,
    default  : ''
  },
  password                : {
    type     : String,
    default  : '',
    validate : passwordValidator
  },
  bio                     : {
    type     : String,
    default  : '',
    trim     : true,
    validate : bioValidator
  },
  oldDBpassword           : {
    type    : String,
    default : ''
  },
  provider                : {
    type      : String,
    'default' : 'local'
  },
  salt                    : String,
  providerData            : {},
  additionalProvidersData : {},
  roles                   : {
    type    : [
      {
        type : String,
        enum : ['user', 'admin']
      }
    ],
    default : ['user']
  },
  updated                 : {
    type : Date
  },
  created                 : {
    type    : Date,
    default : Date.now
  },
  resetPasswordToken      : {
    type : String
  },
  resetPasswordExpires    : {
    type : Date
  },
  likesCount              : {
    type    : Number,
    default : 0
  },
  thumbVersion            : {
    type    : String,
    default : ''
  }
});

UserSchema.virtual('username').set(function(username) {
  this._id = username;
}).get(function() {
  return this._id;
});

UserSchema.pre('save', function(next) {
  if (this.password && this.password.length > 6) {
    this.salt = new Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
    this.password = this.hashPassword(this.password);
  }

  next();
});

UserSchema.methods.hashPassword = function(password) {
  if (this.salt && password) {
    return crypto.pbkdf2Sync(password, this.salt, 10000, 64).toString('base64');
  } else {
    return password;
  }
};

UserSchema.methods.hashPasswordOldDB = function(password) {
  if (password) {
    return crypto.createHash('sha1').update(password).digest('hex');
  } else {
    return password;
  }
};

UserSchema.methods.authenticate = function(password) {
  if (this.password) {
    return this.password === this.hashPassword(password);
  } else if (this.oldDBpassword) {
    return this.oldDBpassword === this.hashPasswordOldDB(password);
  }
  return true;
};

UserSchema.methods.isAdmin = function() {
  return this.roles.indexOf('admin') !== -1;
};


UserSchema.statics.findUniqueUsername = function(username, suffix, callback) {
  var _this = this;
  var possibleUsername = username + (suffix || '');

  _this.findOne({
    _id : possibleUsername
  }, function(err, user) {
    if (!err) {
      if (!user) {
        callback(possibleUsername);
      } else {
        return _this.findUniqueUsername(username, (suffix || 0) + 1, callback);
      }
    } else {
      callback(null);
    }
  });
};

UserSchema.plugin(uniqueValidatorPlugin, {message : 'Sorry, given {PATH} is already taken.'});
UserSchema.plugin(paginatePlugin, {});
mongoose.model('User', UserSchema);
