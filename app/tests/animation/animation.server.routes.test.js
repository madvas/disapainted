'use strict';
/*jshint expr: true*/

/**
 * module dependencies.
 */

var app = require('../../../server')
  , config = require('../../../config/config')
  , _ = require('lodash')
  , fs = require('fs')
  , randomstr = require('randomstring')
  , request = require('supertest')
  , should = require('should')
  , async = require('async')
  , sinon = require('sinon')
  , moment = require('moment')
  , mongoose = require('mongoose')
  , User = mongoose.model('User')
  , Animation = mongoose.model('Animation')
  , AnimationFrame = mongoose.model('AnimationFrame')
  , agent = request.agent(app)
  , agent2 = request.agent(app)
  , agentLoggedOut = request.agent(app)
  , mockMailer = require('mock-nodemailer')
  , animationTestData = require(__dirname + '/animation-test-data.json')
  , animListProperties = ['likesCount', 'creator', 'title', 'datePublish', 'framesCount',
                          'dateUpdate', 'dateCreation', 'desc']
  , animListNotProperties = ['comments', 'likes']
  , randName = _.partial(randomstr.generate, 16);


/**
 * Globals
 */
var user, user2, anim, _user, _user2, _anim, animId,
  commentId, animFrames, otherAnimFrames;

/**
 * Test Suites
 */

describe('Animation REST API tests', function() {

  before(function(done) {

    _user = {
      _id      : randName(),
      email    : 'test' + randName() + '@test.com',
      password : 'password',
      provider : 'local'
    };

    _user2 = {
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

    _.extend(_user2, {
      username        : _user2._id,
      confirmPassword : _user2.password
    });

    animFrames = animationTestData.animFrames;
    otherAnimFrames = animationTestData.otherAnimFrames;

    var setupUsers = function() {
      async.parallel([
        function(callback) {
          async.series([
            function(innerCall) {
              user = new User(_user);
              user.save(innerCall);
            },
            function(innerCall) {
              agent.post('/api/auth/signin')
                .send(_user)
                .expect(200)
                .end(innerCall);
            }
          ], callback);
        },
        function(callback) {
          async.series([
            function(innerCall) {
              user2 = new User(_user2);
              user2.save(innerCall);
            },
            function(innerCall) {
              agent2.post('/api/auth/signin')
                .send(_user2)
                .expect(200)
                .end(innerCall);
            }
          ], callback);
        }
      ], done);
    };

    var removed = _.after(3, setupUsers);

    User.find({}).remove(removed);
    Animation.find({}).remove(removed);
    AnimationFrame.find({}).remove(removed);
  });

  describe('Creating and publishing animation', function() {

    it('should allow user to create new animation and get ID', function(done) {
      agent.put('/api/anims')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(/_id/)
        .end(function(err, res) {
          should.not.exist(err);
          animId = res.body._id;
          _.each([animFrames, otherAnimFrames], function(frames) {
            _.each(frames, function(frame) {
              frame.animation = animId;
            });
          });
          done();
        });
    });

    it('should allow user to save animation frames', function(done) {
      agent.post('/api/anims/' + animId + '/edit/frames')
          .send(animFrames)
          .expect(200, done);
    });

    it('should not allow unauthorized to save animation frames', function(done) {
      agent2.post('/api/anims/' + animId + '/edit/frames')
        .send(animFrames)
        .expect(401, done);
    });

    it('should allow user to load frames of editable animation', function(done) {
      agent.get('/api/anims/' + animId + '/edit/frames')
        .query({offset : 0})
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.be.instanceof(Array).and.have.not.lengthOf(0);
          res.body[0].should.have.property('order', 0);
          res.body[0].should.have.property('objectData');
          res.body[0].should.have.property('repeat', 1);
          _.any(res.body, {repeat : 10}).should.eql(true);
          res.body[0].objectData.should.eql(animFrames[0].objectData);
          done();
        });
    });

    it('should load editable frames with offset', function(done) {
      agent.get('/api/anims/' + animId + '/edit/frames')
        .query({offset : 5})
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.be.instanceof(Array).and.have.not.lengthOf(0);
          res.body[0].should.have.property('order', 5);
          res.body[0].should.have.property('objectData');
          res.body[0].should.have.property('repeat');
          res.body[0].objectData.should.eql(animFrames[5].objectData);
          done();
        });
    });

    it('shouldn\'t allow unanthorized to remove frames from animation', function(done) {
      agent2.delete('/api/anims/' + animId + '/edit/frames')
        .query({fromOrder : animFrames.length - 4, count : 3})
        .expect(401, done);
    });

    it('shouldn allow authorized to remove frames from animation', function(done) {
      agent.delete('/api/anims/' + animId + '/edit/frames')
        .query({fromOrder : animFrames.length - 4, count : 3})
        .expect(200)
        .end(function(err) {
          should.not.exist(err);
          Animation.findById(animId, 'framesCount', function(err, anim) {
            should.not.exist(err);
            anim.framesCount.should.eql(animFrames.length - 3);
            done();
          });
        });
    });

    it('should not allow unauthorized to load frames for editing', function(done) {
      agent2.get('/api/anims/' + animId + '/edit/frames')
        .query({offset : 0})
        .expect(401, done);
    });

    it('should not allow to load unpublished animation for watching', function(done) {
      agent.get('/api/anims/' + animId + '/frames')
        .query({offset : 0})
        .expect(500, done);
    });

    it('should not allow unauthorized to publish animation', function(done) {
      agent2.post('/api/anims/' + animId + '/publish')
        .send({title : 'Animation Title', desc : 'Hello'})
        .expect(401, done);
    });

    it('should allow user to publish his animation', function(done) {
      agent.post('/api/anims/' + animId + '/publish')
        .send({title : 'Animation Title', desc : 'Hello'})
        .expect(200, done);
    });

    it('should not allow user to publish his animation second time with different title/desc', function(done) {
      agent.post('/api/anims/' + animId + '/publish')
        .send({title : 'Different Animation Title', desc : 'Hello2'})
        .expect(500, done);
    });

    it('shouldn\'t allow user to edit animation frames after publishing', function(done) {
      agent.post('/api/anims/' + animId + '/edit/frames')
        .send(otherAnimFrames)
        .expect(500, done);
    });

    it('should be able to load animation general info', function(done) {
      agent.get('/api/anims/' + animId)
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('title', 'desc');
          res.body.title.should.eql('Animation Title');
          res.body.desc.should.eql('Hello');
          res.body.should.not.have.properties(animListNotProperties);
          done();
        });
    });
  });

  describe('Loading published animation', function() {
    it('should allow visitors to load published animation frames', function(done) {
      agentLoggedOut.get('/api/anims/' + animId + '/frames')
        .query({offset : 0})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.be.instanceof(Array).and.have.not.lengthOf(0);
          res.body[0].should.have.property('order', 0);
          res.body[0].should.have.property('objectData');
          res.body[0].objectData.should.eql(animFrames[0].objectData);
          done();
        });
    });

    it('should remove duplicate frames after publishing animation', function(done) {
      agentLoggedOut.get('/api/anims/' + animId + '/frames')
        .query({offset : 2})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.be.instanceof(Array).and.have.not.lengthOf(0);
          res.body[0].should.have.property('order', 2);
          res.body[0].should.have.property('objectData');
          res.body[0].objectData.should.eql('');
          done();
        });
    });
  });

  describe('Liking and commenting', function() {
    it('should not allow unauthenticated to like animation', function(done) {
      agentLoggedOut.post('/api/anims/' + animId + '/like')
        .expect(401, done);
    });

    it('should not increase total number of likes to anim creator', function(done) {
      agent.get('/api/users/' + _user._id)
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('_id', 'created', 'likesCount');
          res.body.likesCount.should.eql(0);
          done();
        });
    });

    it('should allow authenticated to like animation', function(done) {
      agent.post('/api/anims/' + animId + '/like')
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.property('likesCount');
          res.body.should.have.property('likes');
          res.body.likes.length.should.eql(1);
          res.body.likesCount.should.eql(1);
          done();
        });
    });

    it('should increase total number of likes to anim creator', function(done) {
      mockMailer.expectEmail(function(sentEmail) {
        _user.email.should.eql(sentEmail.to);
        return true;
      }, done);
      agent.get('/api/users/' + _user._id)
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('_id', 'created', 'likesCount');
          res.body.likesCount.should.eql(1);
          done();
        });
    });

    it('should not allow authenticated to like animation twice', function(done) {
      agent.post('/api/anims/' + animId + '/like')
        .expect(400, done);
    });

    it('should not icrease total number of likes to anim creator, when liked twice', function(done) {
      agent.get('/api/users/' + _user._id)
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('_id', 'created', 'likesCount');
          res.body.likesCount.should.eql(1);
          done();
        });
    });

    it('should return anim info with property, which indicates that logged user liked this anim', function(done) {
      agent.get('/api/anims/' + animId)
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('title', 'desc', 'liked');
          res.body.title.should.not.eql('Different Animation Title');
          res.body.desc.should.eql('Hello');
          res.body.should.not.have.property('comments');
          done();
        });
    });

    it('should not allow unauthenticated to remove like from animation', function(done) {
      agentLoggedOut.post('/api/anims/' + animId + '/unlike')
        .expect(401, done);
    });

    it('should not allow unauthorized to remove like from animation', function(done) {
      agent2.post('/api/anims/' + animId + '/unlike')
        .expect(400, done);
    });

    it('should not decrease total number of likes to anim creator', function(done) {
      agent.get('/api/users/' + _user._id)
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('_id', 'created', 'likesCount');
          res.body.likesCount.should.eql(1);
          done();
        });
    });

    it('should allow authorized to remove like from animation', function(done) {
      agent.post('/api/anims/' + animId + '/unlike')
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.property('likesCount');
          res.body.should.have.property('likes');
          res.body.likes.length.should.eql(0);
          res.body.likesCount.should.eql(0);
          done();
        });
    });

    it('should decrease total number of likes to anim creator', function(done) {
      agent.get('/api/users/' + _user._id)
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('_id', 'created', 'likesCount');
          res.body.likesCount.should.eql(0);
          done();
        });
    });

    it('should not allow unauthenticated to comment animation', function(done) {
      agentLoggedOut.post('/api/anims/' + animId + '/comments')
        .send({message : 'This is comment'})
        .expect(401, done);
    });

    it('should allow authenticated to comment animation', function(done) {
      agent.post('/api/anims/' + animId + '/comments')
        .send({message : 'This is comment'})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.property('_id');
          commentId = res.body._id;
          done();
        });
    });

    it('should not allow unauthenticated to delete comment from animation', function(done) {
      agentLoggedOut.delete('/api/anims/' + animId + '/comments/' + commentId)
        .expect(401, done);
    });

    it('should not allow unauthorized to delete comment from animation', function(done) {
      agent2.delete('/api/anims/' + animId + '/comments/' + commentId)
        .expect(400, done);
    });

    it('should allow authenticated to like a comment', function(done) {
      agent.post('/api/anims/' + animId + '/comments/' + commentId + '/like')
        .expect(200, done);
    });

    it('should allow authorized to delete like from a comment', function(done) {
      agent.post('/api/anims/' + animId + '/comments/' + commentId + '/unlike')
        .expect(200, done);
    });

    it('should allow authorized to delete comment from animation', function(done) {
      agent.delete('/api/anims/' + animId + '/comments/' + commentId)
        .expect(200, done);
    });

    it('should completely remove animation, it\'s frames and decrease author\'s total likes ', function(done) {
      agent.post('/api/anims/' + animId + '/like')
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.likesCount.should.eql(1);
          agent.get('/api/users/' + _user._id)
            .expect(200)
            .end(function(err, res) {
              should.not.exist(err);
              res.body.likesCount.should.eql(1);
              agent.delete('/api/anims/' + animId)
                .expect(200, function(err) {
                  should.not.exist(err);
                  agent.get('/api/users/' + _user._id)
                    .expect(200)
                    .end(function(err, res) {
                      should.not.exist(err);
                      res.body.likesCount.should.eql(0);
                      agent.get('/api/anims/' + animId)
                        .expect(400, done);
                    });
                });
            });
        });
    });
  });

  describe('Getting list of animations', function() {

    /**
     * Fill database with 20 Animations each filled
     * with published frames
     */
    before(function(done) {
      var clock = sinon.useFakeTimers(new Date().getTime())
        , _anims = _.map(_.range(20), function(n) {
          var likes = _.map(_.range(_.random(6)), _.partial(randomstr.generate, 16));
          return {
            title      : randomstr.generate(30),
            creator    : n < 10 ? _user._id : _user2._id,
            likes      : likes,
            likesCount : likes.length,
            desc       : randomstr.generate(120),
          };
        });

      Animation.find({}).remove(function(err) {
        should.not.exist(err);
        async.eachSeries(_anims, function(anim, next) {
          var newAnim = new Animation(anim);
          newAnim.datePublish = new Date();
          newAnim.save(function(err, savedAnim) {
            should.not.exist(err);
            clock.tick(100);
            var framesSaved = _.after(animFrames.length, next);
            _.each(animFrames, function(frame) {
              frame.animation = savedAnim._id;
              frame = new AnimationFrame(frame);
              frame.save(function(err) {
                should.not.exist(err);
                framesSaved();
              });
            });
          });
        }, function() {
          clock.restore();
          done();
        });
      });
    });

    it('should get list of animation based of likes', function(done) {
      agentLoggedOut.get('/api/list/anims/likes/0')
        .query({page : 1, limit : 10})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('list', 'meta');
          res.body.meta.should.have.properties('pageCount', 'totalCount');
          res.body.list.should.be.instanceof(Array).and.have.not.lengthOf(0);
          res.body.list[0].should.have.properties(animListProperties);
          res.body.list[0].should.not.have.properties(animListNotProperties);
          res.body.list[0].framesCount.should.eql(animFrames.length);
          res.body.list[0].likesCount.should.not.be.lessThan(_.last(res.body.list).likesCount);
          done();
        });
    });

    it('should get list of animations based of likes with offset and limit', function(done) {
      agentLoggedOut.get('/api/list/anims/likes/0')
        .query({page : 2, limit : 8})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('list', 'meta');
          res.body.meta.should.have.properties('pageCount', 'totalCount');
          res.body.list.should.be.instanceof(Array).and.have.lengthOf(8);
          res.body.list[0].should.have.properties(animListProperties);
          res.body.list[0].should.not.have.properties(animListNotProperties);
          res.body.list[0].framesCount.should.eql(animFrames.length);
          res.body.list[0].likesCount.should.not.be.lessThan(_.last(res.body.list).likesCount);
          done();
        });
    });

    it('should get list of animation of last 30 days', function(done) {
      agentLoggedOut.get('/api/list/anims/likes/30')
        .query({page : 1, limit : 10})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('list', 'meta');
          res.body.meta.should.have.properties('pageCount', 'totalCount');
          res.body.list.should.be.instanceof(Array).and.have.not.lengthOf(0);
          res.body.list[0].should.have.properties(animListProperties);
          res.body.list[0].should.not.have.properties(animListNotProperties);
          res.body.list[0].framesCount.should.eql(animFrames.length);
          res.body.list[0].likesCount.should.not.be.lessThan(_.last(res.body.list).likesCount);
          done();
        });
    });

    it('should get list of most recent animations', function(done) {
      agentLoggedOut.get('/api/list/anims/recent')
        .query({page : 1, limit : 10})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('list', 'meta');
          res.body.meta.should.have.properties('pageCount', 'totalCount');
          res.body.list.should.be.instanceof(Array).and.have.not.lengthOf(0);
          res.body.list[0].should.have.properties(animListProperties);
          res.body.list[0].should.not.have.properties(animListNotProperties);
          res.body.list[0].framesCount.should.eql(animFrames.length);
          moment(res.body.list[0].datePublish).isAfter(moment(res.body.list[1].datePublish)).should.eql(true);
          done();
        });
    });

    it('should get list of most recent animations with offset and limit', function(done) {
      agentLoggedOut.get('/api/list/anims/recent')
        .query({page : 2, limit : 8})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('list', 'meta');
          res.body.meta.should.have.properties('pageCount', 'totalCount');
          res.body.list.should.be.instanceof(Array).and.have.lengthOf(8);
          res.body.list[0].should.have.properties(animListProperties);
          res.body.list[0].should.not.have.properties(animListNotProperties);
          res.body.list[0].framesCount.should.eql(animFrames.length);
          moment(res.body.list[0].datePublish).isAfter(moment(res.body.list[1].datePublish)).should.eql(true);
          done();
        });
    });

    it('should get list of random animations', function(done) {
      agentLoggedOut.get('/api/list/anims/random')
        .query({limit : 5})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.list.should.be.instanceof(Array).and.have.lengthOf(5);
          res.body.list[0].should.have.properties(animListProperties);
          res.body.list[0].should.not.have.properties(animListNotProperties);
          res.body.list[0].framesCount.should.eql(animFrames.length);
          done();
        });
    });

    it('should get list a user\'s animations', function(done) {
      agent.get('/api/list/anims/user/' + _user._id)
        .query({page : 1, limit : 10, sort : '-dateCreation'})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('list', 'meta');
          res.body.meta.should.have.properties('pageCount', 'totalCount');
          res.body.list.should.be.instanceof(Array).and.have.lengthOf(10);
          res.body.list[0].should.have.properties(animListProperties);
          res.body.list[0].should.not.have.properties(animListNotProperties);
          res.body.list[0].framesCount.should.eql(animFrames.length);
          res.body.list[0].creator.should.eql(_user._id);
          moment(res.body.list[0].datePublish).isAfter(moment(res.body.list[1].datePublish)).should.eql(true);
          done();
        });
    });

    it('should get list a user\'s animations ordered by likes', function(done) {
      agent.get('/api/list/anims/user/' + _user._id)
        .query({page : 2, limit : 2, sort : '-likesCount'})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.properties('list', 'meta');
          res.body.meta.should.have.properties('pageCount', 'totalCount');
          res.body.list.should.be.instanceof(Array).and.have.lengthOf(2);
          res.body.list[0].should.have.properties(animListProperties);
          res.body.list[0].should.not.have.properties(animListNotProperties);
          res.body.list[0].framesCount.should.eql(animFrames.length);
          res.body.list[0].creator.should.eql(_user._id);
          res.body.list[0].likesCount.should.not.be.lessThan(_.last(res.body.list).likesCount);
          done();
        });
    });

    it('should get list of users with most of likes in total', function(done) {
      agentLoggedOut.get('/api/list/users/likes')
        .query({page : 1, limit : 10})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.list.should.be.instanceof(Array).and.have.not.lengthOf(0);
          res.body.list[0].should.have.properties('likesCount', '_id');
          res.body.list[1].likesCount.should.not.be.above(_.last(res.body.list).likesCount);
          done();
        });
    });

  });

  describe('Getting list of comments', function() {
    before(function(done) {
      var commentId;
      anim = new Animation(_anim);
      anim.save(function(err) {
        should.not.exist(err);
        async.timesSeries(40, function(n, next) {
          commentId = anim.addComment(_user._id, 'hello' + n, function(err) {
            should.not.exist(err);
            async.timesSeries(_.random(1, 3), function(m, next2) {
              anim.addLikeToComment(randName(), commentId, function(err) {
                should.not.exist(err);
                next2();
              });
            }, next);
          });
        }, done);
      });
    });

    it('should be able to load comments for given animation', function(done) {
      agentLoggedOut.get('/api/anims/' + anim._id + '/comments')
        .query({offset : 0, sort : '-dateCreation'})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.property('list');
          res.body.list.should.be.instanceof(Array).and.have.not.lengthOf(0);
          _.last(res.body.list).message.should.eql('hello20');
          done();
        });
    });

    it('should be able to load comments for given animation with offset', function(done) {
      agentLoggedOut.get('/api/anims/' + anim._id + '/comments')
        .query({offset : 5, sort : '-dateCreation'})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.property('list');
          res.body.list.should.be.instanceof(Array).and.have.not.lengthOf(0);
          _.last(res.body.list).message.should.eql('hello15');
          done();
        });
    });

    it('should be able to load comments for given animation sorted by comment likes', function(done) {
      agentLoggedOut.get('/api/anims/' + anim._id + '/comments')
        .query({offset : 0, sort : '-likesCount'})
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.have.property('list');
          res.body.list.should.be.instanceof(Array).and.have.not.lengthOf(0);
          res.body.list[0].likesCount.should.not.eql(0);
          res.body.list[0].likesCount.should.not.be.lessThan(_.last(res.body.list).likesCount);
          done();
        });
    });
  });

  describe('Canvas figures', function(){
    it('should load list of available stick-figures', function(done) {
      agent.get('/api/anims/config/figures')
        .expect(200)
        .end(function(err, res) {
          should.not.exist(err);
          res.body.should.be.instanceof(Array).and.have.not.lengthOf(0);
          done();
        });
    });
  });

  after(function(done) {
    done = _.after(3, done);
    User.find({}).remove(done);
    Animation.find({}).remove(done);
    AnimationFrame.find({}).remove(done);
  });
});
