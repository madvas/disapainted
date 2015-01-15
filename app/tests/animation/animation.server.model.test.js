'use strict';
/*jshint expr: true*/

/**
 * module dependencies.
 */

var app = require('../../../server')
  , _ = require('lodash')
  , randomstr = require('randomstring')
  , sinon = require('sinon')
  , should = require('should')
  , async = require('async')
  , mongoose = require('mongoose')
  , User = mongoose.model('User')
  , Animation = mongoose.model('Animation')
  , AnimationFrame = mongoose.model('AnimationFrame')
  , animationTestData = require(__dirname + '/animation-test-data.json')
  , randName = _.partial(randomstr.generate, 16);


/**
 * Globals
 */
var anim, _user, _anim, animFrames;

/**
 * Test Suites
 */

describe('Animation Model Unit Tests:', function() {

  before(function(done) {

    _user = {
      _id      : randName(),
      email    : 'test' + randName() + '@test.com',
      password : 'password',
      provider : 'local'
    };

    _anim = {
      title   : randomstr.generate(30),
      creator : _user._id
    };

    _.extend(_user, {
      username        : _user._id,
      confirmPassword : _user.password
    });

    User.find({}).remove(function() {
      Animation.find({}).remove(function() {
        AnimationFrame.find({}).remove(function() {
          done();
        });
      });
    });
  });

  describe('Model Animation - Creating Animation', function() {
    beforeEach(function(done) {
      anim = new Animation(_anim);
      Animation.find({}).remove(done);
    });

    it('should be able to create new animation and get its new ID', function(done) {
      anim.save(function(err, anim) {
        should.not.exist(err);
        anim.should.have.property('_id');
        Animation.findById(anim._id, function(err, anim) {
          should.not.exist(err);
          should.exist(anim);
          done();
        });
      });
    });

    it('shouldnt allow to create animation without user id', function(done) {
      anim.creator = '';
      anim.save(function(err) {
        should.exist(err);
        done();
      });
    });
  });


  describe('Model AnimationFrame Logic', function() {
    before(function(done) {
      Animation.find({}).remove(function(err) {
        should.not.exist(err);
        anim = new Animation(_anim);
        anim.save(function(err) {
          should.not.exist(err);
          animFrames = _.map(animationTestData.animFrames, function(frame) {
            return new AnimationFrame(_.extend(frame, {
              animation : anim._id
            }));
          });
          done();
        });
      });
    });

    it('should be able to add frames to animations and properly update dateUpdate', function(done) {
      var clock = sinon.useFakeTimers(),
        framesSaved = _.after(animFrames.length, function() {
          Animation.findById(anim._id, 'dateUpdate datePublish', function(err, anim) {
            anim.dateUpdate.should.eql(new Date());
            should.not.exist(anim.datePublish);
            clock.restore();
            done();
          });
        });
      _.each(animFrames, function(frame) {
        frame.save(function(err) {
          should.not.exist(err);
          framesSaved();
        });
      });
    });

    it('should return corrent number of animation total frames', function(done) {
      Animation.findById(anim._id, function(err, loadedAnim) {
        should.not.exist(err);
        loadedAnim.framesCount.should.eql(animFrames.length);
        anim = loadedAnim;
        done();
      });
    });

    it('should be able to remove frames from animation', function(done) {
      anim.removeFrames(animFrames.length - 4, 3, function(err, anim) {
        should.not.exist(err);
        anim.framesCount.should.eql(animFrames.length - 3);
        done();
      });
    });

  });

  describe('Input validation', function() {
    beforeEach(function(done) {
      Animation.find({}).remove(function(err) {
        should.not.exist(err);
        done();
      });
    });

    describe('Model Animation Invalid Input', function() {
      it('shouldnt allow too long title', function(done) {
        anim = new Animation(_.merge(_.clone(_anim), {title : randomstr.generate(300)}));
        anim.save(function(err) {
          should.exist(err);
          done();
        });
      });
    });

    describe('Model AnimationFrame Invalid Data', function() {
      beforeEach(function(done) {
        anim = new Animation(_anim);
        anim.save(function(err) {
          should.not.exist(err);
          animFrames = _.map(animationTestData.animFrames, function(frame) {
            return new AnimationFrame(_.extend(frame, {
              animation : anim._id
            }));
          });
          done();
        });
      });

      it('should not allow to add frame with too much data', function(done) {
        _.each(animFrames, function(val, i) {
          animFrames[i].objectData = randomstr.generate(600000);
        });
        done = _.after(animFrames.length, done);
        _.each(animFrames, function(frame) {
          frame.save(function(err) {
            should.exist(err);
            done();
          });
        });
      });
    });
  });

  after(function(done) {
    var UserQuery = User.find({}),
      AnimationQuery = Animation.find({}),
      AnimationFrameQuery = AnimationFrame.find({});
    async.parallel([
      _.bind(UserQuery.remove, UserQuery),
      _.bind(AnimationQuery.remove, AnimationQuery),
      _.bind(AnimationFrameQuery.remove, AnimationFrameQuery)
    ], done);
  });
});
