'use strict';

module.exports = function(app) {
  var core = require('../../app/controllers/core.server.controller');
  app.post('/contact', core.contact);
};
