(function() {
  'use strict';

  angular
    .module('core')
    .factory('dpBrowserType', dpBrowserType);

  dpBrowserType.$inject = ['$window'];

  /* @ngInject */
  function dpBrowserType($window) {
    var browsers = {chrome : /chrome/i, safari : /safari/i, firefox : /firefox/i, ie : /internet explorer/i}
      , me = {
        getType : getType
      };

    return me;

    ////////////////

    function getType() {
      var userAgent = $window.navigator.userAgent;

      for (var key in browsers) {
        if (browsers[key].test(userAgent)) {
          return key;
        }
      }
      return 'unknown';
    }
  }
})();
