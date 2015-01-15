'use strict';

/**
 * Module dependencies.
 */
require('./user.server.model');

var mongoose = require('mongoose'),
  User = mongoose.model('User'),
  validate = require('mongoose-validator'),
  rattlePlugin = require('mongoose-rattle-plugin'),
  paginatePlugin = require('mongoose-paginate'),
  randomPlugin = require('mongoose-simple-random'),
  config = require('../../config/config'),
  events = require('events'),
  _ = require('lodash'),
  Schema = mongoose.Schema,
  animationEmitter = new events.EventEmitter();


/**
 * mongoose-validator items
 */
var titleValidator = [
  validate({
    validator : 'isLength',
    arguments : [config.animations.titleMinLength, config.animations.titleMaxLength],
    message   : 'Title should be between ' + config.animations.titleMinLength + ' and ' +
      config.animations.titleMaxLength + ' characters'
  })
];

var descValidator = [
  validate({
    validator : 'isLength',
    arguments : [0, config.animations.descMaxLength],
    message   : 'Description should be max ' + config.animations.descMaxLength + ' characters'
  })
];


/**
 * Animation Schema
 *
 * Added fields from rattle-plugin are:
 * 'creator' -> User, which created anim
 * 'likes' -> Array of users, which liked anim
 * 'likesCount' -> Number of likes
 * 'comments' -> Array of comments
 * 'dateCreation' -> Anim date creation
 * 'dateUpdate' -> Anim last update date
 */
var AnimationSchema = new Schema({
  title       : {
    type     : String,
    trim     : true,
    validate : titleValidator
  },
  desc        : {
    type     : String,
    trim     : true,
    validate : descValidator
  },
  datePublish : {
    type      : Date,
    sparse    : true,
    'default' : null
  },
  framesCount : {
    type      : Number,
    'default' : 0
  }
});

/**
 * Animation title can be set only once
 */
AnimationSchema.path('title').set(function(val) {
  if (this.title) return this.title;
  return val;
});

AnimationSchema.methods.completeRemove = function(callback) {
  require('./animation-frame.server.model.js');
  var AnimationFrame = mongoose.model('AnimationFrame'),
    anim = this;

  User.findByIdAndUpdate(this.creator, {$inc : {likesCount : -this.likesCount}}, function(err) {
    if (err) return callback(err);
    AnimationFrame.remove({animation : this._id}, function(err) {
      if (err) return callback(err);
      anim.remove(function(err, anim) {
        callback(err, anim);
      });
    });
  });
};

AnimationSchema.methods.removeFrames = function(fromOrder, count, callback) {
  require('./animation-frame.server.model.js');
  var AnimationFrame = mongoose.model('AnimationFrame'),
    anim = this;

  anim.framesCount -= count;
  anim.save(function(err, updatedAnim) {
    if (err) return callback(err);
    AnimationFrame.remove({
      $and : [
        {animation : anim._id},
        {order : {$gte : fromOrder}}
      ]
    }, function(err) {
      callback(err, updatedAnim);
    });
  });
};

AnimationSchema.statics.findList = function(criteria, sortBy, page, limit, callback) {
  this.paginate(criteria, page, limit, callback, {
    columns : config.animations.listFields,
    sortBy  : sortBy
  });
};

AnimationSchema.statics.getListOfComments = function(animId, sortBy, offset, callback) {
  if (!!~sortBy.indexOf('-')) {
    sortBy = '-comments.' + sortBy.replace('-', '');
  } else {
    sortBy = 'comments.' + sortBy;
  }
  this.aggregate()
    .match({_id : mongoose.Types.ObjectId(animId)})
    .project('comments')
    .unwind('comments')
    .sort(sortBy)
    .skip(+offset)
    .limit(config.animations.commentsPageSize)
    .exec(function(err, result) {
      if (!err && result.length) {
        result = _.pluck(result, 'comments');
      }
      callback(err, result);
    });
};


animationEmitter.on('addLike', function(userId, anim) {
  User.findByIdAndUpdate(anim.creator, {$inc : {likesCount : 1}}).exec();
});

animationEmitter.on('removeLike', function(userId, anim) {
  User.findByIdAndUpdate(anim.creator, {$inc : {likesCount : -1}}).exec();
});


AnimationSchema.plugin(rattlePlugin, {UserIdType : String, emitter : animationEmitter});
AnimationSchema.plugin(paginatePlugin, {});
AnimationSchema.plugin(randomPlugin, {});
mongoose.model('Animation', AnimationSchema);
