(function() {
  'use strict';

  angular
    .module('animations')
    .directive('dpAnimHref', dpAnimHref);

  dpAnimHref.$inject = [];

  /* @ngInject */
  function dpAnimHref() {
    var canvasPath = 'canvas/'
      , animsPath = 'animations/'
      , directive = {
        link     : link,
        restrict : 'A'
      };
    return directive;

    function link(scope, el, attr) {
      attr.$observe('dpAnimHref', function(id) {
        var basePath = attr.dpCanvasHref === 'true' ? canvasPath : animsPath;
        if (id) attr.$set('href', basePath + attr.dpAnimHref);
      });
    }
  }
})();
