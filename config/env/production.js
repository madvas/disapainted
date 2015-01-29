'use strict';

module.exports = {
  db       : {
    uri     : process.env.MONGOHQ_URL || process.env.MONGOLAB_URI || 'mongodb://' +
    (process.env.DB_1_PORT_27017_TCP_ADDR || 'localhost') + '/disapainted',
    options : {
      user : '',
      pass : ''
    }
  },
  port     : process.env.PORT || 3001,
  assets   : {
    lib : {
      css : [],
      js  : [
        'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.10/angular.min.js',
        'public/lib/angular-animate/angular-animate.min.js',
        'public/lib/angular-ui-router/release/angular-ui-router.min.js',
        'public/lib/angular-sanitize/angular-sanitize.min.js',
        'public/lib/angular-messages/angular-messages.min.js',
        'public/lib/angular-aria/angular-aria.min.js',
        'public/lib/angular-ui-utils/ui-utils.min.js',
        'public/dist/customized/ui-bootstrap-custom-build/ui-bootstrap-custom-tpls-0.12.0.min.js',
        'public/lib/ngstorage/ngStorage.min.js',
        'public/lib/lodash/dist/lodash.min.js',
        'public/lib/angular-lodash/angular-lodash.js',
        'public/lib/restangular/dist/restangular.min.js',
        'http://ajax.googleapis.com/ajax/libs/angular_material/0.7.0/angular-material.min.js',
        'public/lib/hammerjs/hammer.min.js',
        'public/lib/angular-bootstrap-colorpicker/js/bootstrap-colorpicker-module.js',
        'public/lib/ngtoast/dist/ngToast.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.9.21/paper-core.min.js',
        'public/lib/angular-socialshare/angular-socialshare.min.js',
        'public/lib/angular-timeago/src/timeAgo.js',
        'http://platform.twitter.com/widgets.js',
        '//assets.pinterest.com/js/pinit.js',
        'node_modules/jsonpack/main.js',
        'public/lib/angulartics/dist/angulartics.min.js',
        'public/lib/angulartics/dist/angulartics-ga.min.js',
        'public/lib/ng-file-upload/angular-file-upload.min.js'
      ]
    },
    css : [
      'public/lib/angular-socialshare/angular-socialshare.min.css',
      'http://ajax.googleapis.com/ajax/libs/angular_material/0.7.0/angular-material.min.css',
      'public/lib/ngtoast/dist/ngToast.min.css',
      'public/lib/angular-bootstrap-colorpicker/css/colorpicker.css',
      'https://fonts.googleapis.com/css?family=RobotoDraft:300,400',
      'public/dist/build/application.min.css'
    ],
    js  : 'public/dist/build/application.min.js'
  },
  log      : {
    format  : 'combined',
    options : {
      stream : 'logs/access.log'
    }
  },
  facebook : {
    clientID     : process.env.FACEBOOK_ID || 'APP_ID',
    clientSecret : process.env.FACEBOOK_SECRET || 'APP_SECRET',
    callbackURL  : '/api/auth/facebook/callback'
  },
  twitter  : {
    clientID     : process.env.TWITTER_ID || 'CONSUMER_KEY',
    clientSecret : process.env.TWITTER_SECRET || 'CONSUMER_SECRET',
    callbackURL  : '/api/auth/twitter/callback'
  },
  google   : {
    clientID     : process.env.GOOGLE_ID || 'APP_ID',
    clientSecret : process.env.GOOGLE_SECRET || 'APP_SECRET',
    callbackURL  : '/api/auth/google/callback'
  },
  linkedin : {
    clientID     : process.env.LINKEDIN_ID || 'APP_ID',
    clientSecret : process.env.LINKEDIN_SECRET || 'APP_SECRET',
    callbackURL  : '/api/auth/linkedin/callback'
  },
  github   : {
    clientID     : process.env.GITHUB_ID || 'APP_ID',
    clientSecret : process.env.GITHUB_SECRET || 'APP_SECRET',
    callbackURL  : '/api/auth/github/callback'
  },
  mailer   : {
    from    : process.env.MAILER_FROM || 'noreply@disapainted.com',
    options : {
      service : process.env.MAILER_SERVICE_PROVIDER || undefined,
      port    : process.env.MAILER_PORT || 25,
      auth    : {
        user : process.env.MAILER_EMAIL_ID || undefined,
        pass : process.env.MAILER_PASSWORD || undefined
      }
    }
  }
};
