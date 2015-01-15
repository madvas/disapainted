'use strict';

/**
 * Module dependencies.
 */
require('./animation.server.model.js');

var mongoose = require('mongoose')
  , Animation = mongoose.model('Animation')
  , validate = require('mongoose-validator')
  , config = require('../../config/config')
  , Schema = mongoose.Schema;


var objectDataValidator = [
  validate({
    validator : 'isLength',
    arguments : [0, 500000],
    message   : 'objectData is too big'
  })
];

/**
 * AnimationFrame Schema
 */
var AnimationFrameSchema = new Schema({
  animation  : {
    type     : Schema.Types.ObjectId,
    ref      : 'Animation',
    required : true
  },
  objectData : {
    type     : String,
    validate : objectDataValidator
  },
  order      : {
    type      : Number,
    'default' : 0,
    min       : 0,
    max       : config.animations.framesLimit - 1
  },
  repeat     : {
    type      : Number,
    'default' : 1,
    min       : 1,
    max       : 999
  }
});

AnimationFrameSchema.pre('save', function(next) {
  this.wasNew = this.isNew;
  next();
});

AnimationFrameSchema.post('save', function(frame) {
  var condition = {dateUpdate : Date.now()};
  if (this.wasNew) {
    condition.$inc = {framesCount : 1};
  }
  Animation.findByIdAndUpdate(frame.animation, condition).exec();
});


AnimationFrameSchema.statics.findChunk = function(fromOrder, animId, callback) {
  this.find({
    $and : [
      {order : {$gte : fromOrder}},
      {order : {$lt : parseInt(fromOrder) + config.animations.framesPageSize}},
      {animation : animId}
    ]
  }, callback);
};

AnimationFrameSchema.index({animation : 1, order : 1}, {unique : true});
mongoose.model('AnimationFrame', AnimationFrameSchema);

