/* jshint ignore:start */
// Generated by CoffeeScript 1.8.0
(function() {
  var
    app = require('../../../../server'),
    randomstr = require('randomstring'),
    _ = require('lodash'),
    async = require('async'),
    sinon = require('sinon'),
    assert = require('assert'),
    should = require('should'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Animation = mongoose.model('Animation'),
    ObjectId = _.partial(randomstr.generate, 16);

  describe("MongooseRattlePlugin", function() {
    var commentorUserId, objectCreatorUserId, anim;
    anim = {};
    commentorUserId = ObjectId();
    objectCreatorUserId = ObjectId();

    beforeEach(function(done) {
      Animation.remove(done);
    });
    describe("document.save(callback)", function() {
      it("update dateCreation and dateUpdate when inserting", function(done) {
        var clock;
        clock = sinon.useFakeTimers();
        new Animation({
          creator : objectCreatorUserId,
          owner   : objectCreatorUserId
        }).save(function(err, animSaved) {
            assert.deepEqual(new Date(), animSaved.dateCreation);
            assert.deepEqual(new Date(), animSaved.dateUpdate);
            clock.restore();
            done();
          });
      });
      it("only update dateUpdate when updating", function(done) {
        var clock;
        clock = sinon.useFakeTimers(new Date(2011, 0, 1, 1, 1, 36).getTime());
        new Animation({
          creator : objectCreatorUserId,
          owner   : objectCreatorUserId
        }).save(function(err, animSaved) {
            clock.restore();
            clock = sinon.useFakeTimers(new Date(2012, 0, 1, 1, 1, 36).getTime());
            animSaved.save(function(err, animSaved) {
              assert.notDeepEqual(new Date(), animSaved.dateCreation);
              assert.deepEqual(new Date(), animSaved.dateUpdate);
              clock.restore();
              done();
            });
          });
      });
    });
    describe("Plugin methods", function() {
      beforeEach(function(done) {
        new Animation({
          creator : objectCreatorUserId,
          owner   : objectCreatorUserId
        }).save(function(err, animSaved) {
            anim = animSaved;
            done();
          });
      });
      describe("document.getComment(commentId)", function() {
        var commentIds, level1UserOneMsg, level1UserTwoMsg, userOneId, userTwoId;
        userOneId = ObjectId();
        userTwoId = ObjectId();
        level1UserOneMsg = 'level1 message ' + userOneId;
        level1UserTwoMsg = 'level1 message ' + userTwoId;
        commentIds = {};
        beforeEach(function(done) {
          anim.comments = [
            {
              message : level1UserOneMsg,
              creator : userOneId
            },
            {
              message : level1UserTwoMsg,
              creator : userTwoId
            }
          ];
          commentIds['level 1 ' + userOneId] = anim.comments[0]._id;
          commentIds['level 1 ' + userTwoId] = anim.comments[1]._id;
          anim.save(done);
        });
        it("retrieve null if comment doesn't exist", function() {
          assert.equal(null, anim.getComment('n0t3x1t1n9'));
        });
        it("retrieve comment", function() {
          assert.equal(level1UserOneMsg, anim.getComment(commentIds['level 1 ' + userOneId]).message);
          assert.equal(level1UserTwoMsg, anim.getComment(commentIds['level 1 ' + userTwoId]).message);
        });
        it("retrieve a comment when commentId is a string and not an ObjectId", function() {
          assert.equal(level1UserOneMsg, anim.getComment(String(commentIds['level 1 ' + userOneId])).message);
        });
      });
      describe("document.addComment(userId, message, callback)", function() {
        it("append a new comment and comment id", function(done) {
          var commentId;
          commentId = anim.addComment(commentorUserId, 'dummy message', function(err) {
            should.not.exists(err);
            should.exists(commentId);
            Animation.findById(anim._id, function(err, updatedAnimation) {
              should.exists(updatedAnimation);
              assert.equal(1, updatedAnimation.comments.length);
              done();
            });
          });
        });
        it("update dateCreation and dateUpdated", function(done) {
          var clock, commentId;
          clock = sinon.useFakeTimers();
          commentId = anim.addComment(commentorUserId, 'dummy message', function(err, updatedAnimation) {
            assert.deepEqual(new Date(), updatedAnimation.getComment(commentId).dateCreation);
            assert.deepEqual(new Date(), updatedAnimation.getComment(commentId).dateUpdate);
            clock.restore();
            done();
          });
        });
        it("fails if message length is out of min and max", function(done) {
          anim.addComment(commentorUserId, '', function(err) {
            should.exists(err);
            done();
          });
        });
      });
      describe("document.editComment(userId, commentId, message, callback)", function() {
        var commentId, updatedMessage;
        commentId = null;
        updatedMessage = 'dummy message updated';
        beforeEach(function(done) {
          var clock;
          clock = sinon.useFakeTimers(new Date(2011, 0, 1, 1, 1, 36).getTime());
          commentId = anim.addComment(commentorUserId, 'dummy message', function(err) {
            clock.restore();
            done();
          });
        });
        it("fails if message length is out of min and max", function(done) {
          anim.editComment(commentorUserId, commentId, '', function(err) {
            should.exists(err);
            done();
          });
        });
        describe('when user is not the creator', function() {
          it("always fails", function(done) {
            anim.editComment('n0t3x1t1n9', commentId, updatedMessage, function(err) {
              should.exists(err);
              done();
            });
          });
        });
        describe('when user is the creator', function() {
          var checkEditCommentWhenOwner;
          checkEditCommentWhenOwner = function(commentorUserId, commentId, updatedMessage, done) {
            anim.editComment(commentorUserId, commentId, updatedMessage, function(err) {
              should.not.exists(err);
              should.exists(commentId);
              Animation.findById(anim._id, function(err, updatedAnimation) {
                should.exists(updatedAnimation);
                assert.equal(1, updatedAnimation.comments.length);
                assert.equal(updatedMessage, updatedAnimation.comments[0].message);
                done();
              });
            });
          };
          it("edit comment and comment id if user is the owner", function(done) {
            checkEditCommentWhenOwner(commentorUserId, commentId, updatedMessage, done);
          });
          it("edit comment and comment id if user is the owner when userId is a string", function(done) {
            checkEditCommentWhenOwner(String(commentorUserId), commentId, updatedMessage, done);
          });
          it("update dateCreation and dateUpdated", function(done) {
            var clock;
            clock = sinon.useFakeTimers(new Date(2012, 0, 1, 1, 1, 36).getTime());
            anim.editComment(commentorUserId, commentId, updatedMessage, function(err, updatedAnimation) {
              assert.notDeepEqual(new Date(), updatedAnimation.getComment(commentId).dateCreation);
              assert.deepEqual(new Date(), updatedAnimation.getComment(commentId).dateUpdate);
              clock.restore();
              done();
            });
          });
        });
      });
      describe("document.removeComment(userId, commentId, callback)", function() {
        var commentIds, level1Msg;
        level1Msg = 'level1 message';
        commentIds = {};
        beforeEach(function(done) {
          anim.comments = [
            {
              message : level1Msg,
              creator : commentorUserId
            },
            {
              message : 'level1 second message',
              creator : commentorUserId
            }
          ];
          commentIds['level 1'] = anim.comments[0]._id;
          anim.save(done);
        });
        it("fails if comment doesn't exist", function(done) {
          anim.removeComment(commentorUserId, 'n0t3x1t1n9', function(err, updatedAnimation) {
            should.exists(err);
            done();
          });
        });
        describe('when user is not the creator', function() {
          it("it's not removing the comment", function(done) {
            anim.removeComment('n0t3x1t1n9', commentIds['level 1'], function(err, updatedAnimation) {
              should.exists(updatedAnimation);
              should.exists(updatedAnimation.getComment(commentIds['level 1']));
              done();
            });
          });
        });
        describe('when user is the creator', function() {
          it("can remove comment", function(done) {
            anim.removeComment(commentorUserId, commentIds['level 1'], function(err, updatedAnimation) {
              should.exists(updatedAnimation);
              should.not.exists(updatedAnimation.getComment(commentIds['level 1']));
              done();
            });
          });
          it("remove comment when userId param is a string", function(done) {
            anim.removeComment(String(commentorUserId), commentIds['level 1'], function(err, updatedAnimation) {
              should.exists(updatedAnimation);
              should.not.exists(updatedAnimation.getComment(commentIds['level 1']));
              done();
            });
          });
          it("remove comment when commentId is a string", function(done) {
            anim.removeComment(commentorUserId, String(commentIds['level 1']), function(err, updatedAnimation) {
              should.exists(updatedAnimation);
              should.not.exists(updatedAnimation.getComment(commentIds['level 1']));
              done();
            });
          });
        });
      });
      describe("document.addLike(userId, callback)", function() {
        it("add one user like if user doesn't already liked", function(done) {
          anim.addLike(commentorUserId, function(err, updatedAnimation) {
            assert.equal(1, updatedAnimation.likes.length);
            assert.equal(1, updatedAnimation.likesCount);
            done();
          });
        });
        it("not add an other user like if user already liked", function(done) {
          anim.addLike(commentorUserId, function(err, updatedAnimation) {
            assert.equal(1, updatedAnimation.likes.length);
            assert.equal(1, updatedAnimation.likesCount);
            updatedAnimation.addLike(commentorUserId, function(err, updatedAnimation) {
              assert.equal(1, updatedAnimation.likes.length);
              assert.equal(1, updatedAnimation.likesCount);
              done();
            });
          });
        });
        it("not add an other user like if user already liked and userId param is a string", function(done) {
          anim.addLike(commentorUserId, function(err, updatedAnimation) {
            anim.addLike(String(commentorUserId), function(err, updatedAnimation) {
              assert.equal(1, updatedAnimation.likes.length);
              assert.equal(1, updatedAnimation.likesCount);
              done();
            });
          });
        });
      });
      describe("document.removeLike(userId, callback)", function() {
        var userOneId, userTwoId;
        userOneId = ObjectId();
        userTwoId = ObjectId();
        beforeEach(function(done) {
          async.series([
            function(callback) {
              anim.addLike(commentorUserId, function(err, updatedAnimation) {
                anim = updatedAnimation;
                callback();
              });
            }, function(callback) {
              anim.addLike(userOneId, function(err, updatedAnimation) {
                anim = updatedAnimation;
                callback();
              });
            }
          ], done);
        });
        it("not affect current likes list if user didn'nt already liked", function(done) {
          anim.removeLike(userTwoId, function(err, updatedAnimation) {
            assert.equal(2, updatedAnimation.likes.length);
            assert.equal(2, updatedAnimation.likesCount);
            done();
          });
        });
        it("remove user like from likes list if user already liked", function(done) {
          anim.removeLike(commentorUserId, function(err, updatedAnimation) {
            assert.equal(1, updatedAnimation.likes.length);
            assert.equal(1, updatedAnimation.likesCount);
            done();
          });
        });
        it("remove user like from likes list if user already liked when userId param is a string", function(done) {
          anim.removeLike(String(commentorUserId), function(err, updatedAnimation) {
            assert.equal(1, updatedAnimation.likes.length);
            assert.equal(1, updatedAnimation.likesCount);
            done();
          });
        });
        it("remove likesCount keep 0 when no there is no more likes", function(done) {
          anim.removeLike(String(commentorUserId), function(err, updatedAnimation) {
            anim.removeLike(String(userOneId), function(err, updatedAnimation) {
              anim.removeLike(String(userOneId), function(err, updatedAnimation) {
                assert.equal(0, updatedAnimation.likes.length);
                assert.equal(0, updatedAnimation.likesCount);
                done();
              });
            });
          });
        });
      });
      describe("document.addLikeToComment(userId, commentId, callback)", function() {
        var commentId, level1Msg;
        level1Msg = 'level1 message';
        commentId = '';
        beforeEach(function(done) {
          anim.comments = [
            {
              message : 'level1 message',
              creator : commentorUserId
            }
          ];
          commentId = anim.comments[0]._id;
          anim.save(done);
        });
        it("fails if comment doesn't exist", function(done) {
          anim.addLikeToComment(commentorUserId, 'n0t3x1t1n9', function(err, updatedAnimation) {
            should.exists(err);
            done();
          });
        });
        it("add one user like if user doesn't already liked and comment exists", function(done) {
          anim.addLikeToComment(commentorUserId, commentId, function(err, updatedAnimation) {
            assert.equal(1, updatedAnimation.getComment(commentId).likes.length);
            assert.equal(1, updatedAnimation.getComment(commentId).likesCount);
            done();
          });
        });
        it("not add an other user like if user already liked and comment exists", function(done) {
          anim.addLikeToComment(commentorUserId, commentId, function(err, updatedAnimation) {
            anim.addLikeToComment(commentorUserId, commentId, function(err, updatedAnimation) {
              assert.equal(1, updatedAnimation.getComment(commentId).likes.length);
              assert.equal(1, updatedAnimation.getComment(commentId).likesCount);
              done();
            });
          });
        });
        it("not add an other user like if user already liked and comment exists when userId param is a string", function(done) {
          anim.addLikeToComment(String(commentorUserId), commentId, function(err, updatedAnimation) {
            anim.addLikeToComment(commentorUserId, commentId, function(err, updatedAnimation) {
              assert.equal(1, updatedAnimation.getComment(commentId).likes.length);
              assert.equal(1, updatedAnimation.getComment(commentId).likesCount);
              done();
            });
          });
        });
      });
      describe("document.removeLikeFromComment(userId, commentId, callback)", function() {
        var commentId, level1Msg;
        level1Msg = 'level1 message';
        commentId = '';
        beforeEach(function(done) {
          anim.comments = [
            {
              message : 'level1 message',
              creator : commentorUserId,
              likes   : [commentorUserId, ObjectId()]
            }
          ];
          commentId = anim.comments[0]._id;
          anim.save(done);
        });
        it("fails if comment doesn't exist", function(done) {
          anim.removeLikeFromComment(commentorUserId, 'n0t3x1t1n9', function(err, updatedAnimation) {
            should.exists(err);
            done();
          });
        });
        it("not affect current likes list if user didn'nt already liked", function(done) {
          anim.removeLikeFromComment(ObjectId(), commentId, function(err, updatedAnimation) {
            assert.equal(2, updatedAnimation.getComment(commentId).likes.length);
            assert.equal(2, updatedAnimation.getComment(commentId).likesCount);
            done();
          });
        });
        it("remove user like from likes list if user already liked", function(done) {
          anim.removeLikeFromComment(commentorUserId, commentId, function(err, updatedAnimation) {
            assert.equal(1, updatedAnimation.getComment(commentId).likes.length);
            assert.equal(1, updatedAnimation.getComment(commentId).likesCount);
            done();
          });
        });
        it("remove user like from likes list if user already liked when userId param is a string", function(done) {
          anim.removeLikeFromComment(String(commentorUserId), commentId, function(err, updatedAnimation) {
            assert.equal(1, updatedAnimation.getComment(commentId).likes.length);
            assert.equal(1, updatedAnimation.getComment(commentId).likesCount);
            done();
          });
        });
      });
    });
    describe("Plugin statics", function() {
      describe("document.getList", function() {
        var creator1Id, creator2Id;
        creator1Id = ObjectId();
        creator2Id = ObjectId();
        beforeEach(function(done) {
          var rattles, save;
          rattles = [
            {
              creator  : creator1Id,
              likes    : [ObjectId(), ObjectId()],
              comments : [
                {
                  message : '11',
                  creator : ObjectId()
                },
                {
                  message : '12',
                  creator : ObjectId()
                }
              ]
            },
            {
              creator  : creator2Id,
              likes    : [ObjectId(), ObjectId()],
              comments : [
                {
                  message : '21',
                  creator : ObjectId()
                },
                {
                  message : '22',
                  creator : ObjectId()
                }
              ]
            }
          ];
          async.eachSeries(rattles, (save = function(rattleData, next) {
            new Animation(rattleData).save(next);
          }), done);
        });
        describe("(num, maxNumLastPostComments, callback)", function() {
          it("get list of the number of 'num' last rattles and likesCount instead of likes array", function(done) {
            Animation.find({}, function(err, rattles) {
              Animation.getList(1, 0, function(err, rattles) {
                should.not.exists(err);
                assert.equal(rattles.length, 1);
                assert.deepEqual(rattles[0].creator, creator2Id);
                assert(!rattles[0].likes);
                assert.equal(rattles[0].likesCount, 2);
                done();
              });
            });
          });
          it("get all rattles if 'num' is greater than the number of rattles", function(done) {
            Animation.getList(3, 0, function(err, rattles) {
              should.not.exists(err);
              assert.equal(rattles.length, 2);
              done();
            });
          });
          it("each rattle get the maximum of 'maxLastComments' last comments", function(done) {
            Animation.getList(1, 1, function(err, rattles) {
              should.not.exists(err);
              assert.equal(rattles.length, 1);
              assert.deepEqual(rattles[0].creator, creator2Id);
              should.exists(rattles[0].comments);
              assert.equal(rattles[0].comments.length, 1);
              assert.equal(rattles[0].comments[0].message, '22');
              done();
            });
          });
          it("each all comments when 'maxLastComments' is greater than number of comments", function(done) {
            Animation.getList(1, 3, function(err, rattles) {
              should.not.exists(err);
              assert.equal(rattles.length, 1);
              should.exists(rattles[0].comments);
              assert.equal(rattles[0].comments.length, 2);
              done();
            });
          });
        });
        describe("(num, maxNumLastPostComments, options, callback)", function() {
          describe("from a creation date", function() {
            it("get list of last rattles created from the 'fromDate'", function(done) {
              Animation.getList(1, 0, function(err, rattles) {
                Animation.getList(1, 0, {
                  fromCreationDate : rattles[0].dateCreation
                }, function(err, rattles) {
                  should.not.exists(err);
                  assert.equal(rattles.length, 1);
                  assert.deepEqual(rattles[0].creator, creator1Id);
                  done();
                });
              });
            });
            it("get all last rattles if 'num' is greater than the number of last rattles", function(done) {
              Animation.getList(1, 0, function(err, rattles) {
                Animation.getList(2, 0, {
                  fromCreationDate : rattles[0].dateCreation
                }, function(err, rattles) {
                  should.not.exists(err);
                  assert.equal(rattles.length, 1);
                  done();
                });
              });
            });
            it("each rattle get the maximum of 'maxLastComments' last comments", function(done) {
              Animation.getList(1, 0, function(err, rattles) {
                Animation.getList(1, 1, {
                  fromCreationDate : rattles[0].dateCreation
                }, function(err, rattles) {
                  should.not.exists(err);
                  assert.equal(rattles.length, 1);
                  assert.deepEqual(rattles[0].creator, creator1Id);
                  should.exists(rattles[0].comments);
                  assert.equal(rattles[0].comments.length, 1);
                  assert.equal(rattles[0].comments[0].message, '12');
                  done();
                });
              });
            });
          });
          describe("populating", function() {
            it("build", function(done) {
              var email = 'test' + randomstr.generate(16) + '@test.com';
              new User({
                _id      : creator2Id,
                email    : email,
                password : 'password',
                provider : 'local'
              }).save(function(err) {
                  Animation.getList(1, 0, {
                    populate : 'creator'
                  }, function(err, rattles) {
                    should.not.exists(err);
                    assert.equal(rattles.length, 1);
                    should.exists(rattles[0].creator.email);
                    assert.equal(rattles[0].creator.email, email);
                    done();
                  });
                });
            });
          });
        });
      });
      describe("document.getListOfCommentsById(rattleId, num, offsetFromEnd, callback)", function() {
        var creatorId, rattleId;
        creatorId = ObjectId();
        rattleId = null;
        beforeEach(function(done) {
          var pushComments, saveAnimation;
          async.waterfall([
            saveAnimation = function(next) {
              new Animation({
                creator : creatorId
              }).save(function(err, data) {
                  if (err) {
                    next(err);
                  }
                  rattleId = data._id;
                  next(null, data);
                });
            }, pushComments = function(anim, next) {
              var comments, push;
              comments = [
                {
                  message : '11',
                  creator : ObjectId()
                },
                {
                  message : '12',
                  creator : ObjectId()
                },
                {
                  message : '13',
                  creator : ObjectId()
                }
              ];
              async.eachSeries(comments, (push = function(comment, next) {
                anim.addComment(comment.creator, comment.message, next);
              }), next);
            }
          ], done);
        });
        it("get last 'num' of comments for 'rattleId' when offsetFromEnd is 0", function(done) {
          Animation.getListOfCommentsById(rattleId, 1, 0, function(err, comments) {
            should.not.exists(err);
            assert.equal(comments.length, 1);
            assert.equal(comments[0].message, '13');
            done();
          });
        });
        it("get last num of comments from the offsetFromEnd", function(done) {
          Animation.getListOfCommentsById(rattleId, 1, 1, function(err, comments) {
            should.not.exists(err);
            assert.equal(comments.length, 1);
            assert.equal(comments[0].message, '12');
            done();
          });
        });
        it("get no comments when offsetFromEnd is equal to the number of comments", function(done) {
          Animation.getListOfCommentsById(rattleId, 1, 3, function(err, comments) {
            should.not.exists(err);
            assert.equal(comments.length, 0);
            done();
          });
        });
        it("limit comments when offsetFromEnd + num is greater that the number of comments", function(done) {
          Animation.getListOfCommentsById(rattleId, 3, 1, function(err, comments) {
            should.not.exists(err);
            assert.equal(comments[0].message, '11');
            assert.equal(comments[1].message, '12');
            assert.equal(comments.length, 2);
            done();
          });
        });
        it("keep comments order", function(done) {
          Animation.getListOfCommentsById(rattleId, 3, 0, function(err, comments) {
            should.not.exists(err);
            assert.equal(comments[0].message, '11');
            assert.equal(comments[1].message, '12');
            assert.equal(comments[2].message, '13');
            assert.equal(comments.length, 3);
            done();
          });
        });
      });
    });
  });

}).call(this);
