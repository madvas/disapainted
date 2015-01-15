(function() {
  'use strict';

  angular
    .module('users')
    .directive('dpPortrait', dpPortrait);

  dpPortrait.$inject = ['dpPaperScope', '$rootScope'];

  /* @ngInject */
  function dpPortrait(dpPaperScope, $rootScope) {
    var p = dpPaperScope
      , directive = {
        link     : link,
        restrict : 'A'
      };
    return directive;

    function link(scope, el) {
      p.paperScope.setup(el[0]);
      $rootScope.$broadcast('projectReady');
    }
  }
})();

