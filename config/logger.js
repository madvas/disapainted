'use strict';

var config = require('./config')
  , stream = require('logrotate-stream');

module.exports = {

  getLogFormat : function() {
    return config.log.format;
  },

  getLogOptions : function() {
    var options = {};

    try {
      if ('stream' in config.log.options) {
        options = {
          stream : stream({
            file : process.cwd() + '/' + config.log.options.stream,
            size : '10m',
            keep : 5
          })
        };
      }
    } catch (e) {
      options = {};
    }

    return options;
  }

};
