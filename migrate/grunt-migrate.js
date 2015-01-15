'use strict';

var mongoose = require('mongoose'),
  mysql = require('mysql'),
  async = require('async'),
  fs = require('fs'),
  base64resize = require('base64resize'),
  userThumbSrc = 'public/dist/thumbnails/users/',
  userThumbDst = 'public/dist/thumbnails/users/',
  _ = require('lodash');

var app, User, Animation, AnimationFrame, config, connection, users = [], limit;

module.exports = function(grunt) {

  grunt.registerTask('migrate', 'Migrates old disapainted database', function() {
    process.env.NODE_ENV = grunt.config('migrate.options.env');
    userThumbSrc = grunt.config('migrate.options.thumbsSrc') || userThumbSrc;

    app = require('../server');
    User = mongoose.model('User');
    Animation = mongoose.model('Animation');
    AnimationFrame = mongoose.model('AnimationFrame');
    config = require('../config/config');

    grunt.log.writeln('Connecting to remote database...');

    var me = this,
      done = me.async();

    connection = mysql.createConnection({
      host               : 'disapainted.com',
      user               : grunt.config('migrate.options.mysqlUser'),
      password           : grunt.config('migrate.options.mysqlPass'),
      database           : 'disapainted'
    });

    connection.connect(function(err) {
      if (err) {
        grunt.log.error('Error connecting: ' + err.stack);
        done();
        return;
      }
      grunt.log.ok('Connected as id ' + connection.threadId);

      _.delay(function() {
        async.series([
          clearUsers,
          migrateUsers,
          //clearAnimations,
          //loadUsers,
          //migrateAnimations,
          //removeDuplicateAnims,
          //createAnimationThumbnails
        ], function() {
          grunt.log.writeln('Ending...');
          connection.end(done);
        });
      }, 3000);

    });
  });

  function migrateUsers(next) {
    connection.query('SELECT user_id, username AS _id, password AS oldDBpassword, email, "local" as provider FROM users', function(err, rows) {
      if (err) throw err;

      async.each(rows, function(row, callback) {
        async.parallel([
          function(clb1) {
            var user = new User(row);
            grunt.log.writeln('migrating user ' + row._id);
            user.save(clb1);
          },
          function(clb2) {
            var oldFile = userThumbSrc + 'disapainted_u' + row.user_id + '.png';
            if (fs.existsSync(oldFile)) {
              grunt.log.debug('moving thumb of user ' + row._id);
              fs.rename(oldFile, userThumbDst + row._id + '.png', clb2);
            } else {
              grunt.log.debug('thumb didnt exist ' + row._id);
              clb2();
            }
          }
        ], function() {
          users.push({username : row._id, user_id : row.user_id});
          grunt.log.debug('done with user ' + row._id + ' ' + row.user_id);
          callback();
        })
      }, function() {
        grunt.log.writeln('done with all users');
        next();
      });
    });
  }

  function migrateAnimations(next) {
    var creators = users;
    //if (limit) {
      var start = 2159;
    grunt.log.writeln('users: ' + users.length);
      creators = users.slice(start, limit ? start + limit : undefined);
    grunt.log.writeln('creators: ' + creators.length);
    //}

    async.eachSeries(creators, function(user, eachUserNext) {
      var anim;
      grunt.log.writeln('Migrating animations of user ' + user.username + ' ' + _.findIndex(users, user));
      //if (_.contains(['madison232', 'kaharazy', 'pyromonkeez', 'agnese'], user.username)) return eachUserNext();
      connection.query('SELECT anim_id, publish_date AS datePublish, create_date AS created, title FROM published_animations ' +
        'WHERE user_id = ' + user.user_id + ';', function(err, rows) {
        if (err) throw err;

        async.eachSeries(rows, function(_anim, eachAnimNext) {
          async.waterfall([
            function(clb1) {
              _anim.creator = user.username;
              anim = new Animation(_anim);
              anim.save(function(err, anim) {
                Animation.findByIdAndUpdate(anim._id, {dateCreation : _anim.created}, function(err) {
                  if (err) grunt.log.error(err);
                  Animation.findById(anim._id, function(err, updatedAnim) {
                    clb1(err, updatedAnim, _anim.anim_id);
                  });
                });
              });
            },
            migrateAnimationFrames,
            migrateAnimationComments
          ], function(err) {
            if (err) {
              grunt.log.error('Error migrating anim ' + _anim.anim_id + ': ' + _anim.title + ' . -> Skipping');
              Animation.findByIdAndRemove(anim._id, function(err) {
                if (err) grunt.log.error('Err deleting invalid anim: ' + err);
              });
            }
            eachAnimNext();
          });
        }, eachUserNext);

      });
    }, function() {
      grunt.log.debug('done with animations');
      next();
    });
  }

  function migrateAnimationFrames(anim, anim_id, next) {
    var query;
    query = 'SELECT frame_ord AS `order`, frame_src AS frameData, "" AS objectData FROM published_animations_src ' +
      'WHERE anim_id = ' + anim_id;
    connection.query(query, function(err, rows) {
      if (err) throw err;
      async.each(rows, function(_frame, frameNext) {
        _frame.frameData = _frame.frameData.toString().substring(22);
        _frame.animation = anim._id;
        var frame = new AnimationFrame(_frame);
        frame.save(function(err) {
          if (err) grunt.log.error(err);
          if (frame.order == 0) {
            base64resize({
              src    : 'data:image/png;base64,' + frame.frameData,
              dst    : config.animations.thumbnails.dir + frame.animation + '.png',
              width  : config.animations.thumbnails.width,
              height : config.animations.thumbnails.height
            }, function(err) {
              if (err) grunt.log.error(err);
              frameNext(err);
            });
          } else {
            frameNext(err);
          }
        });
      }, function(err) {
        next(err, anim, anim_id);
      });
    });
  }

  function migrateAnimationComments(anim, anim_id, next) {
    var commentId;
    connection.query('SELECT user_id, comment_date, comment_text AS message FROM comments ' +
      'WHERE anim_id = ' + anim_id, function(err, rows) {
      if (err) throw err;
      async.eachSeries(rows, function(comment, commentNext) {
        commentId = anim.addComment(_.find(users, {user_id : comment.user_id}).username, comment.message, function(err, updatedAnim) {
          if (err) grunt.log.error(err);
          updatedAnim.getComment(commentId).dateCreation = comment.comment_date;
          updatedAnim.save(function(err, updatedAnim) {
            if (err) grunt.log.error(err);
            anim = updatedAnim;
            commentNext();
          })
        });
      }, function(err) {
        next(err, anim, anim_id);
      })
    });
  }

  function removeDuplicateAnims(next) {
    async.eachSeries(users, function(user, userNext) {
      Animation.find({creator : user.username, datePublish : {$ne : null}}, function(err, anims) {
        if (err) grunt.log.error(err);
        async.eachSeries(anims, function(anim, animNext) {
          AnimationFrame.find({animation : anim._id}, 'frameData', {sort : {order : 1}}, function(err, frames) {
            if (err) grunt.log.error(err);
            frames = _.pluck(frames, 'frameData').slice(0, 10);
            async.each(anims, function(comparedAnim, comparedAnimNext) {
              if (comparedAnim._id == anim._id) return comparedAnimNext();
              AnimationFrame.find({animation : comparedAnim._id}, 'frameData', {sort : {order : 1}}, function(err, cmpFrames) {
                if (err) grunt.log.error(err);
                cmpFrames = _.pluck(cmpFrames, 'frameData').slice(0, 10);
                if (_.isEmpty(_.difference(frames, cmpFrames))) {
                  grunt.log.writeln('Found too similar animations ' + user.username + ' ' + anim._id + '-' +
                    comparedAnim._id + ' ' + anim.title + ' - ' + comparedAnim.title);
                  var removeId = (anim.framesCount <= comparedAnim.framesCount) ? anim._id : comparedAnim._id;
                  Animation.findByIdAndRemove(removeId, function() {
                    AnimationFrame.remove({animation : removeId}, comparedAnimNext);
                  });
                } else {
                  comparedAnimNext();
                }
              });
            }, animNext)
          })
        }, userNext)
      })
    }, next)
  }

  function createAnimationThumbnails(next) {
    AnimationFrame.find({order : 0}, 'animation frameData', function(err, frames) {
      if (err) grunt.log.error(err);
      async.each(frames, function(frame, frameNext) {
        base64resize({
          src    : 'data:image/png;base64,' + frame.frameData,
          dst    : config.animations.thumbnails.dir + frame.animation + '.png',
          width  : config.animations.thumbnails.width,
          height : config.animations.thumbnails.height
        }, function(err) {
          if (err) grunt.log.error(err);
          frameNext();
        });
      }, next)
    })
  }

  function loadUsers(next) {
    connection.query('SELECT user_id, username FROM users', function(err, rows) {
      users = rows;
      next(err);
    });
  }

  function clearAnimations(next) {
    next = _.after(2, next);
    Animation.find({}).remove(next);
    AnimationFrame.find({}).remove(next);
  }

  function clearUsers(next) {
    User.find({}).remove(next);
  }

};
