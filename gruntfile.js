'use strict';

var fs = require('fs');

module.exports = function(grunt) {
  // Unified Watch Object
  var watchFiles = {
    serverViews : ['app/views/**/*.*'],
    serverJS    : ['gruntfile.js', 'server.js', 'config/**/*.js', 'app/**/*.js'],
    clientViews : ['public/modules/**/views/**/*.html'],
    clientJS    : ['public/js/*.js', 'public/modules/**/*.js'],
    clientCSS   : ['public/modules/**/*.css'],
    lessFiles   : ['public/modules/**/*.less'],
    spriteFiles : ['public/modules/**/img/**/*.png'],
    mochaTests  : ['app/tests/**/*.js']
  };

  var webhookPort = process.env.WEBHOOK_PORT || 3000;
  // Project Configuration
  grunt.initConfig({
    pkg              : grunt.file.readJSON('package.json'),
    watch            : {
      serverViews : {
        files   : watchFiles.serverViews,
        options : {
          livereload : true
        }
      },
      serverJS    : {
        files   : watchFiles.serverJS,
        tasks   : ['jshint'],
        options : {
          livereload : true
        }
      },
      clientViews : {
        files   : watchFiles.clientViews,
        options : {
          livereload : true
        }
      },
      clientJS    : {
        files   : watchFiles.clientJS,
        tasks   : ['jshint'],
        options : {
          livereload : true
        }
      },
      clientCSS   : {
        files   : watchFiles.clientCSS,
        tasks   : ['csslint'],
        options : {
          livereload : true
        }
      },
      lessFiles   : {
        files   : watchFiles.lessFiles,
        tasks   : ['loadConfig', 'less:dev'],
        options : {}
      }
    },
    jshint           : {
      all : {
        src     : watchFiles.clientJS.concat(watchFiles.serverJS),
        options : {
          jshintrc : true
        }
      }
    },
    csslint          : {
      options : {
        csslintrc : '.csslintrc'
      },
      all     : {
        src : watchFiles.clientCSS
      }
    },
    uglify           : {
      options : {
        mangle : false
      },
      production : {
        files   : {
          'public/dist/build/application.min.js' : 'public/dist/build/application.js'
        }
      },
      material : {
        files : {
          'public/dist/customized/angular-material/angular-material.min.js' :
            'public/dist/customized/angular-material/angular-material.js'
        }
      }
    },
    cssmin           : {
      combine : {
        files : {
          'public/dist/build/application.min.css' : '<%= applicationCSSFiles %>'
        }
      },
      material : {
        files : {
          'public/dist/customized/angular-material/angular-material.min.css' :
            'public/dist/customized/angular-material/angular-material.css'
        }
      }
    },
    nodemon          : {
      dev : {
        script  : 'server.js',
        options : {
          nodeArgs : ['--debug'],
          ext      : 'js,html',
          ignore   : ['node_modules/**', 'public/**'],
          watch    : watchFiles.serverViews.concat(watchFiles.serverJS)
        }
      }
    },
    'node-inspector' : {
      custom : {
        options : {
          'web-port'          : 1337,
          'web-host'          : 'localhost',
          'debug-port'        : 5858,
          'save-live-edit'    : true,
          'no-preload'        : true,
          'stack-trace-limit' : 50,
          'hidden'            : []
        }
      }
    },
    ngAnnotate       : {
      production : {
        files : {
          'public/dist/build/application.js' : '<%= applicationJavaScriptFiles %>'
        }
      }
    },
    concurrent       : {
      default : ['nodemon', 'watch'],
      debug   : ['nodemon', 'watch', 'node-inspector'],
      dev     : ['nodemon', 'watch:lessFiles'],
      options : {
        logConcurrentOutput : true,
        limit               : 10
      }
    },
    env              : {
      test       : {
        NODE_ENV : 'test'
      },
      production : {
        NODE_ENV : 'production'
      },
      dev        : {
        NODE_ENV : 'development'
      }
    },
    mochaTest        : {
      src     : watchFiles.mochaTests,
      options : {
        reporter : 'spec',
        require  : 'server.js'
      }
    },
    less             : {
      dev : {
        options : {
          sourceMap       : true,
          dumpLineNumbers : 'comments',
          paths           : '<%= applicationLESSPaths %>',
          relativeUrls    : true
        },
        files   : {
          'public/dist/build/application.css' : '<%= applicationLESSFiles %>'
        }
      }
    },
    protractor       : {
      options : {
//        configFile: "node_modules/protractor/referenceConf.js", // Default config file
        keepAlive : true, // If false, the grunt process stops when the test fails.
        noColor   : false // If true, protractor will not use colors in its output.
      },
      dev     : {
        options : {
          configFile : 'protractor.conf.js'
        }
      }
    },
    gitpull          : {
      master : {
        options : {}
      }
    },
    forever          : {
      production : {
        options : {
          index  : 'server.js',
          logDir : 'logs'
        }
      }
    },
    shell            : {
      webhook : {
        command : 'webhook-deployer -p ' + webhookPort + ' >> logs/webhook.log',
        options : {
          async       : true,
          execOptions : {
            detached : true
          }
        }
      }
    },
    /* jshint camelcase: false */
    auto_install     : {
      local : {}
    },
    prompt           : {
      mysql : {
        options : {
          questions : [
            {
              config  : 'migrate.options.mysqlUser',
              type    : 'input',
              message : 'Enter mysql username: '
            },
            {
              config  : 'migrate.options.mysqlPass',
              type    : 'input',
              message : 'Enter mysql password: '
            },
            {
              config  : 'migrate.options.thumbsSrc',
              type    : 'input',
              message : 'Enter path from which user thumbnails should be moved to a new server path: '
            },
            {
              config  : 'migrate.options.env',
              type    : 'checkbox',
              message : 'Choose environment',
              choices : ['development', 'production']
            }
          ]
        }
      }
    }
  });

  require('load-grunt-tasks')(grunt);
  grunt.loadTasks('migrate');
  // Making grunt default to force in order not to break the project.
  grunt.option('force', true);

  // A Task for loading the configuration object
  grunt.task.registerTask('loadConfig', 'Task that loads the config into a grunt option.', function() {
    var init = require('./config/init')();
    var config = require('./config/config');
    grunt.config.set('applicationJavaScriptFiles', config.assets.js);
    grunt.config.set('applicationCSSFiles', config.assets.css);
    grunt.config.set('applicationLESSFiles', config.less.files);
    grunt.config.set('applicationLESSPaths', config.less.paths);
  });


  grunt.registerTask('dev', ['env:dev', 'lint', 'concurrent:dev']);
  grunt.registerTask('production', ['build', 'env:production', 'forever:production:restart', 'webhook']);
  grunt.registerTask('production-stop', ['forever:production:stop']);
  grunt.registerTask('default', ['production']);

  // Lint task(s).
  grunt.registerTask('lint', ['jshint', 'csslint']);

  // Build task(s).
  grunt.registerTask('build', ['lint', 'env:dev', 'loadConfig', 'less:dev', 'ngAnnotate', 'uglify:production',
                               'cssmin:combine']);
  grunt.registerTask('buildLess', ['env:dev','loadConfig', 'less:dev']);

  // Test tasks.
  grunt.registerTask('test', ['env:test', 'mochaTest']);

  grunt.registerTask('migrateUsers', ['prompt:mysql', 'migrate']);
  grunt.registerTask('pull-production', ['gitpull:master', 'build', 'auto_install:local', 'env:production',
                                         'forever:production:restart']);
  grunt.registerTask('webhook', ['create-deploys', 'shell:webhook']);
  grunt.registerTask('protractor', ['protractor:dev']);

  grunt.task.registerTask('create-deploys', 'Sets basepath in deploys.json file', function() {
    var config = require(__dirname + '/deploysTpl.json');
    config.deploys[0].basepath = __dirname;
    fs.writeFileSync('deploys.json', JSON.stringify(config));
  });
};
