(function() {
  'use strict';

  angular
    .module('users')
    .directive('dpUserHref', dpUserHref);

  dpUserHref.$inject = [];

  /* @ngInject */
  function dpUserHref() {
    var basePath = 'users/'
      , directive = {
        link     : link,
        restrict : 'A'
      };
    return directive;

    function link(scope, el, attr) {
      attr.$observe('dpUserHref', function(id) {
        if (id) attr.$set('href', basePath + attr.dpUserHref);
      });
    }
  }
})();
