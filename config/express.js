'use strict';

/**
 * Module dependencies.
 */
var fs = require('fs')
  , http = require('http')
  , https = require('https')
  , express = require('express')
  , expressValidator = require('express-validator')
  , apiRouter = express.Router()
  //, morgan = require('morgan')
  , bodyParser = require('body-parser')
  , session = require('express-session')
  , compress = require('compression')
  , methodOverride = require('method-override')
  , cookieParser = require('cookie-parser')
  , helmet = require('helmet')
  //, logger = require('./logger')
  , passport = require('passport')
  , mongoStore = require('connect-mongo')({
    session : session
  })
  , config = require('./config')
  , consolidate = require('consolidate')
  , _ = require('lodash')
  , path = require('path');

module.exports = function(db) {
  var app = express();

  config.getGlobbedFiles('./app/models/**/*.js').forEach(function(modelPath) {
    require(path.resolve(modelPath));
  });

  app.locals.title = config.app.title;
  app.locals.description = config.app.description;
  app.locals.keywords = config.app.keywords;
  app.locals.facebookAppId = config.facebook.clientID;
  app.locals.jsFiles = config.getJavaScriptAssets();
  app.locals.cssFiles = config.getCSSAssets();
  app.locals.secure = config.secure;
  app.locals.anims = _.omit(config.animations, 'thumbnails');
  app.locals.anims.canvas.pictures = config.getCanvasPictures();
  app.locals.users = _.omit(config.users, 'listFields', 'portraits');
  // Passing the request url to environment locals
  app.use(function(req, res, next) {
    res.locals.baseUrl = req.protocol + '://' + req.headers.host;
    res.locals.url = res.locals.baseUrl + req.url;
    res.locals.imgUrl = res.locals.baseUrl;
    if (!!~req.url.indexOf('/animations/')) {
      res.locals.imgUrl += '/dist/thumbnails/anims/' + _.last(req.url.split('/')) + '.png';
    } else if (!!~req.url.indexOf('/users/')) {
      res.locals.imgUrl += '/dist/thumbnails/users/' + _.last(req.url.split('/')) + '.png';
    } else {
      res.locals.imgUrl += '/modules/core/img/disapainted.png';
    }
    next();
  });

  // Should be placed before express.static
  app.use(compress({
    filter : function(req, res) {
      return (/json|text|javascript|css|svg|jsonpack/).test(res.getHeader('Content-Type'));
    },
    level  : 3
  }));

  // Showing stack errors
  app.set('showStackError', true);

  // Set swig as the template engine
  app.engine('server.view.html', consolidate[config.templateEngine]);

  // Set views path and view engine
  app.set('view engine', 'server.view.html');
  app.set('views', './app/views');


  // Environment dependent middleware
  if (process.env.NODE_ENV === 'development') {
    // Disable views cache
    app.set('view cache', false);
  } else if (process.env.NODE_ENV === 'production') {
    app.locals.cache = 'memory';
  }

  // Request body parsing middleware should be above methodOverride
  app.use(bodyParser.json({limit : '3mb'}));
  app.use(bodyParser.urlencoded({
    extended : true,
    limit    : '3mb'
  }));

  app.use(expressValidator());
  app.use(methodOverride());

  // CookieParser should be above session
  app.use(cookieParser());

  // Express MongoDB session storage
  app.use(session({
    saveUninitialized : true,
    resave            : true,
    secret            : config.sessionSecret,
    cookie            : config.sessionCookie,
    name              : config.sessionName,
    store             : new mongoStore({
      db         : db.connection.db,
      collection : config.sessionCollection
    })
  }));

  // use passport session
  app.use(passport.initialize());
  app.use(passport.session());

  // Use helmet to secure Express headers
  app.use(helmet.xssFilter());
  app.use(helmet.nosniff());
  app.use(helmet.ienoopen());
  app.disable('x-powered-by');

  // Setting the app router and static folder
  app.use(express.static(path.resolve('./public')));
  app.use(express.static(path.resolve('./node_modules')));


  // Globbing routing files
  config.getGlobbedFiles('./app/routes/**/*.js').forEach(function(routePath) {
    require(path.resolve(routePath))(apiRouter);
  });

  app.use('/api', apiRouter);

  // This route deals enables HTML5Mode by forwarding missing files to the index.html
  app.all('/*', function(req, res) {
    res.render('index', {
      user    : req.user || null,
      request : req
    });
  });

  app.use(function(err, req, res, next) {
    if (!err) return next();
    console.error(err.stack);
    res.status(500).render('500', {
      error : err.stack
    });
  });

  if (process.env.NODE_ENV === 'secure') {
    var privateKey = fs.readFileSync('./config/sslcerts/key.pem', 'utf8');
    var certificate = fs.readFileSync('./config/sslcerts/cert.pem', 'utf8');

    return https.createServer({
      key  : privateKey,
      cert : certificate
    }, app);
  }

  return app;
};
