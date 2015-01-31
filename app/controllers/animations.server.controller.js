'use strict';

var mongoose = require('mongoose')
  , errHandler = require('./errors.server.controller')
  , Animation = mongoose.model('Animation')
  , _ = require('lodash')
  , AnimationFrame = mongoose.model('AnimationFrame')
  , config = require('../../config/config')
  , moment = require('moment')
  , fs = require('fs')
  , readdirp = require('readdirp')
  , base64resize = require('base64resize');


exports.create = function(req, res) {
  new Animation({creator : req.user})
    .save(function(err, anim) {
      if (err) return res.status(400).json(errHandler.getErrMsg(err));
      return res.status(200).json(_.pick(anim, '_id'));
    });
};

exports.animationById = function(req, res, next) {
  Animation.findById(req.params.animId, function(err, anim) {
    if (err) return next(err);
    if (!anim) return next(new Error('Failed to load Animation ' + req.params.animId));
    req.anim = anim;
    next();
  });
};

exports.requiresPublished = function(req, res, next) {
  if (req.anim.datePublish) {
    return next();
  }
  return next(new Error('Animation wasn\'t published yet'));
};

exports.requiresUnpublished = function(req, res, next) {
  if (!req.anim.datePublish) {
    return next();
  }
  return next(new Error('Animation was already published'));
};

exports.hasAuthorization = function(req, res, next) {
  if (!req.user.isAdmin() && req.anim.creator !== req.user._id) {
    return res.status(401).end();
  }
  next();
};

exports.attachUserLikes = function(req, anims) {
  anims = _.isArray(anims) ? anims : [anims];
  return _.map(anims, function(anim) {
    anim = anim.toObject();
    anim.liked = req.isAuthenticated() && !!~anim.likes.indexOf(req.user._id);
    delete anim.likes;
    return anim;
  });
};

exports.info = function(req, res) {
  Animation.findById(req.params.animId, '-comments', function(err, anim) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    if (!anim) return res.status(400).json({message : 'Failed to load Animation ' + req.params.animId});
    anim = exports.attachUserLikes(req, anim)[0];
    return res.status(200).json(anim);
  });
};

exports.publish = function(req, res) {
  req.anim.title = req.body.title;
  req.anim.desc = req.body.desc;
  req.anim.datePublish = new Date();
  req.anim.save(function(err, anim) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    anim.removeDuplicateFrames(function(err) {
      if (err) return res.status(400).json(errHandler.getErrMsg(err));
      return res.status(200).end();
    });
  });
};

exports.save = function(req, res) {
  var errors = [], newFrame,
    framesSaved = _.after(req.body.length, function() {
      if (errors.length) return res.status(400).json(errors);
      return res.status(200).end();
    });
  _.each(req.body, function(frame) {
    AnimationFrame.findOne({animation : req.anim._id, order : frame.order}, function(err, loadedFrame) {
      if (err) return errors.push(_.extend({order : frame.order}, errHandler.getErrMsg(err)));
      if (loadedFrame) {
        loadedFrame.set('objectData', frame.objectData);
        loadedFrame.set('repeat', frame.repeat);
        newFrame = loadedFrame;
      } else {
        newFrame = new AnimationFrame({
          animation  : req.anim._id,
          order      : frame.order,
          objectData : frame.objectData,
          repeat     : frame.repeat
        });
      }
      newFrame.save(function(err) {
        if (err) {
          errors.push(_.extend({order : frame.order}, errHandler.getErrMsg(err)));
        } else if (frame.order === 0) {
          base64resize({
            src    : frame.thumbnail,
            dst    : config.animations.thumbnails.dir + frame.animation + '.png',
            width  : config.animations.thumbnails.width,
            height : config.animations.thumbnails.height
          }, function(err) {
            if (err) errors.push(_.extend({order : frame.order}, errHandler.getErrMsg(err)));
          });
        }
        framesSaved();
      });
    });
  });
};


exports.remove = function(req, res) {
  req.anim.completeRemove(function(err) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    return res.status(200).end();
  });
};

exports.loadFrames = function(req, res) {
  AnimationFrame.findChunk(req.query.offset, req.anim._id, function(err, frames) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    res.status(200).json(frames);
  });
};

exports.removeFrames = function(req, res) {
  req.anim.removeFrames(req.query.fromOrder, req.query.count, function(err) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    return res.status(200).send();
  });
};


exports.like = function(req, res) {
  req.anim.addLike(req.user._id, function(err, anim) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    return res.status(200).send(_.pick(anim, 'likesCount', 'likes'));
  });
};

exports.unlike = function(req, res) {
  req.anim.removeLike(req.user._id, function(err, anim) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    return res.status(200).send(_.pick(anim, 'likesCount', 'likes'));
  });
};

exports.likeComment = function(req, res) {
  req.anim.addLikeToComment(req.user._id, req.params.commentId, function(err) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    return res.status(200).end();
  });
};

exports.unlikeComment = function(req, res) {
  req.anim.removeLikeFromComment(req.user._id, req.params.commentId, function(err) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    return res.status(200).end();
  });
};

exports.addComment = function(req, res) {
  var commentId = req.anim.addComment(req.user._id, req.body.message, function(err) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    return res.status(200).json({_id : commentId});
  });
};

exports.removeComment = function(req, res) {
  req.anim.removeComment(req.user._id, req.params.commentId, function(err) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    return res.status(200).end();
  });
};

exports.comments = function(req, res) {
  Animation.getListOfComments(req.params.animId, req.query.sort, req.query.offset, function(err, comments) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    return res.status(200).json({list : comments});
  });
};

exports.listAnimsLikes = function(req, res) {
  var criteria = {datePublish : {$ne : null}};
  if (+req.params.days) {
    criteria.datePublish.$gt = moment().subtract(req.params.days, 'days').toDate();
  }
  Animation.findList(criteria, {likesCount : -1, datePublish : -1},
    req.query.page, req.query.limit, function(err, pageCount, anims, totalCount) {
      if (err) return res.status(400).json(errHandler.getErrMsg(err));
      anims = exports.attachUserLikes(req, anims);
      return res.status(200).json({meta : {pageCount : pageCount, totalCount : totalCount}, list : anims});
    });
};

exports.listAnimsRecent = function(req, res) {
  Animation.findList({datePublish : {$ne : null}}, {datePublish : -1}, req.query.page, req.query.limit,
    function(err, pageCount, anims, totalCount) {
      if (err) return res.status(400).json(errHandler.getErrMsg(err));
      anims = exports.attachUserLikes(req, anims);
      return res.status(200).json({meta : {pageCount : pageCount, totalCount : totalCount}, list : anims});
    });
};

exports.listAnimsRandom = function(req, res) {
  Animation.findRandom({datePublish : {$ne : null}}, config.animations.listFields,
    {limit : req.query.limit}, function(err, anims) {
      anims = exports.attachUserLikes(req, anims);
      return res.status(200).json({meta : {}, list : anims});
    });
};

exports.userAnims = function(req, res) {
  var criteria = {creator : req.params.userId},
    columns = config.animations.listFields;
  if (parseInt(req.query.editable) && req.isAuthenticated() && req.user._id === req.params.userId) {
    req.query.sort = req.query.sort.replace('datePublish', 'dateUpdate');
    criteria.datePublish = null;
  } else {
    criteria.datePublish = {$ne : null};
  }
  Animation.paginate(criteria, req.query.page, req.query.limit, function(err, pageCount, anims, totalCount) {
    if (err) return res.status(400).json(errHandler.getErrMsg(err));
    anims = exports.attachUserLikes(req, anims);
    return res.status(200).json({meta : {pageCount : pageCount, totalCount : totalCount}, list : anims});
  }, {
    columns : columns,
    sortBy  : req.query.sort || '-likesCount'
  });
};


exports.figures = function(req, res) {
  readdirp({root : 'public/' + config.animations.canvas.figuresPath, fileFilter : '*.png'}, _.noop,
    function(err, readRes) {
      if (err) return res.status(400).json({message : 'Sorry, I was unable to get stick-figures'});
      var figureTypes = _.map(readRes.files, function(file) {
        return file.name.slice(0, -4);
      });
      res.status(200).send(figureTypes);
    });
};
