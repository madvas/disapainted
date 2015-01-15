'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
  glob = require('glob'),
  path = require('path');

/**
 * Load app configurations
 */
module.exports = _.extend(
  require('./env/all'),
    require('./env/' + process.env.NODE_ENV) || {}
);

/**
 * Get files by glob patterns
 */
module.exports.getGlobbedFiles = function(globPatterns, rootsToRemove) {
  // For context switching
  var me = this;

  // URL paths regex
  var urlRegex = new RegExp('^(?:[a-z]+:)?\/\/', 'i');

  // The output array
  var output = [];

  // If glob pattern is array so we use each pattern in a recursive way, otherwise we use glob
  if (_.isArray(globPatterns)) {
    globPatterns.forEach(function(globPattern) {
      output = _.union(output, me.getGlobbedFiles(globPattern, rootsToRemove));
    });
  } else if (_.isString(globPatterns)) {
    if (urlRegex.test(globPatterns)) {
      output.push(globPatterns);
    } else {
      glob(globPatterns, {
        sync : true
      }, function(err, files) {
        if (!_.isEmpty(rootsToRemove)) {
          files = files.map(function(file) {
            _.each(rootsToRemove, function(rootToRemove) {
              file = file.replace(rootToRemove, '');
            });
            return file;
          });
        }

        output = _.union(output, files);
      });
    }
  }

  return output;
};

/**
 * Get the modules JavaScript files
 */
module.exports.getJavaScriptAssets = function(includeTests) {
  var output = this.getGlobbedFiles(this.assets.lib.js.concat(this.assets.js),
    ['public/', 'node_modules/']);

  // To include tests
  if (includeTests) {
    output = _.union(output, this.getGlobbedFiles(this.assets.tests));
  }

  return output;
};

/**
 * Get the modules CSS files
 */
module.exports.getCSSAssets = function() {
  return this.getGlobbedFiles(this.assets.lib.css.concat(this.assets.css), 'public/');
};

module.exports.getCanvasPictures = function() {
  var me = this;
  return _.mapValues(this.animations.canvas.pictures, function(category) {
    return me.getGlobbedFiles(category, 'public/');
  });
};
