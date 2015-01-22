'use strict';

module.exports = function(app) {
  var users = require('../../app/controllers/users.server.controller'),
    anims = require('../../app/controllers/animations.server.controller'),
    core = require('../../app/controllers/core.server.controller');

  app.put('/anims', users.requiresLogin, anims.create);
  app.post('/anims/:animId/publish', users.requiresLogin, anims.animationById, anims.hasAuthorization,
    anims.requiresUnpublished, anims.publish);

  app.route('/anims/:animId/edit/frames')
    .all(users.requiresLogin, anims.animationById, anims.hasAuthorization, anims.requiresUnpublished)
    .get(anims.loadFrames)
    .post(anims.save)
    .delete(anims.removeFrames);

  app.route('/anims/:animId')
    .get(anims.info)
    .delete(users.requiresLogin, anims.animationById, anims.hasAuthorization, anims.remove);

  app.get('/anims/:animId/frames', anims.animationById, anims.requiresPublished, anims.loadFrames);

  app.post('/anims/:animId/like', users.requiresLogin, anims.animationById, anims.requiresPublished, anims.like);
  app.post('/anims/:animId/unlike', users.requiresLogin, anims.animationById, anims.requiresPublished, anims.unlike);

  app.route('/anims/:animId/comments')
    .get(anims.comments)
    .post(users.requiresLogin, anims.animationById, anims.requiresPublished, anims.addComment);

  app.delete('/anims/:animId/comments/:commentId', users.requiresLogin, anims.animationById, anims.requiresPublished,
    anims.removeComment);

  app.post('/anims/:animId/comments/:commentId/like', users.requiresLogin, anims.animationById, anims.requiresPublished,
    anims.likeComment);
  app.post('/anims/:animId/comments/:commentId/unlike', users.requiresLogin, anims.animationById,
    anims.requiresPublished, anims.unlikeComment);

  app.get('/list/anims/likes', core.limit, anims.listAnimsLikes);
  app.get('/list/anims/likes/:days', core.limit, anims.listAnimsLikes);
  app.get('/list/anims/recent', core.limit, anims.listAnimsRecent);
  app.get('/list/anims/random', core.limit, anims.listAnimsRandom);
  app.get('/list/anims/user/:userId', core.limit, anims.userAnims);

  app.get('/anims/config/figures', users.requiresLogin, anims.figures);
};
