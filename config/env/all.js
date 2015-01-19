'use strict';

var path = require('path')
  , rootPath = path.normalize(__dirname + '/../..')
  , canvasPicturesPath = 'public/modules/canvas/img/';

module.exports = {
  app               : {
    title       : 'Disapainted',
    description : 'Disapainted.com is a web application for creating pivot animations online. Pivot animations are' +
    'funny 2D stick-man animations, which you easily create by dragging stick figure handles. The webapp is heavily ' +
    'inspired by Pivot Animator desktop application',
    keywords    : 'mongodb, express, angularjs, node.js, mongoose, passport'
  },
  port              : process.env.PORT || 3000,
  secure            : process.env.SECURE || false,
  templateEngine    : 'swig',
  sessionSecret     : 'DisaPainted',
  sessionCollection : 'sessions',
  sessionCookie     : {
    path     : '/',
    httpOnly : true,
    secure   : false,
    maxAge   : 1209600000 // 2 weeks
  },
  sessionName       : 'connect.sid',
  log               : {
    format  : 'dev',
    options : {}
  },
  assets            : {
    lib   : {
      css : [],
      js  : [
        'public/lib/angular/angular.js',
        'public/lib/angular-animate/angular-animate.js',
        'public/lib/angular-sanitize/angular-sanitize.min.js',
        'public/lib/angular-messages/angular-messages.min.js',
        'public/lib/angular-ui-router/release/angular-ui-router.js',
        'public/lib/angular-ui-utils/ui-utils.js',
        'public/dist/customized/ui-bootstrap-custom-build/ui-bootstrap-custom-tpls-0.12.0.min.js',
        'public/lib/ngstorage/ngStorage.js',
        'public/lib/lodash/dist/lodash.js',
        'public/lib/angular-lodash/angular-lodash.js',
        'public/lib/restangular/dist/restangular.js',
        'public/lib/angular-aria/angular-aria.min.js',
        'public/dist/customized/angular-material/angular-material.js',
        'public/lib/hammerjs/hammer.min.js',
        'public/lib/angular-bootstrap-colorpicker/js/bootstrap-colorpicker-module.js',
        'public/lib/ngtoast/dist/ngToast.min.js',
        'public/lib/paper/dist/paper-core.js',
        'http://platform.twitter.com/widgets.js',
        '//assets.pinterest.com/js/pinit.js',
        'public/lib/angular-socialshare/angular-socialshare.js',
        'node_modules/jsonpack/main.js',
        'public/lib/angular-timeago/src/timeAgo.js',
        'public/lib/angulartics/dist/angulartics.min.js',
        'public/lib/angulartics/dist/angulartics-ga.min.js',
        'public/lib/ng-file-upload/angular-file-upload.min.js'
      ]
    },
    css   : [
      'public/lib/angular-socialshare/angular-socialshare.min.css',
      'public/dist/customized/angular-material/angular-material.css',
      'public/lib/ngtoast/dist/ngToast.min.css',
      'https://fonts.googleapis.com/css?family=RobotoDraft:300,400',
      'public/lib/angular-bootstrap-colorpicker/css/colorpicker.css',
      'public/dist/build/application.css'
    ],
    js    : [
      'public/config.js',
      'public/application.js',
      'public/modules/*/*.js',
      'public/modules/**/*[!tests]*/*.js'
    ],
    tests : [
      'public/modules/*/tests/*.js'
    ]
  },
  less              : {
    paths : [
      'public/lib/bootstrap/less',
      'public/modules/core/less',
      'public/modules/animations/less',
      'public/modules/canvas/less',
      'public/modules/users/less'
    ],
    files : 'public/modules/core/less/manifest.less'
  },
  animations        : {
    framesLimit       : 1500,
    listPageSize      : 15,
    framesPageSize    : 7,
    commentsPageSize  : 20,
    userAnimsPageSize : 25,
    cacheAnims        : 3,
    titleMinLength    : 4,
    titleMaxLength    : 70,
    descMaxLength     : 140,
    listFields        : '-comments',
    thumbnails        : {
      dir    : rootPath + '/public/dist/thumbnails/anims/',
      width  : 300,
      height : 169
    },
    canvas            : {
      width    : 640,
      height   : 360,
      pictures : {
        objects  : canvasPicturesPath + 'objects/*.*',
        effects  : canvasPicturesPath + 'effects/*.*',
        weapons : canvasPicturesPath + 'weapons/*.*'
      }
    }
  },
  users             : {
    maxBioLength : 140,
    listFields   : '_id created likesCount bio',
    portraits    : {
      dir    : rootPath + '/public/dist/thumbnails/users/',
      width  : 246,
      height : 293
    },
    contact      : {
      email   : process.env.CONTACT_EMAIL || 'disapainted@gmail.com',
      msgLen  : 2000,
      subjLen : 100
    }
  }
};
