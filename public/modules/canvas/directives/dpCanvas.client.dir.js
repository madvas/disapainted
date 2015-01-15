(function() {
  'use strict';

  angular
    .module('canvas')
    .directive('dpCanvas', dpCanvas);

  dpCanvas.$inject = ['dpCanvas', 'dpCanvasTool', 'dpCanvasPaper', 'dpPaperScope', 'dpCanvasFrames'];

  /* @ngInject */
  function dpCanvas(dpCanvasService, dpCanvasTool, dpCanvasPaper, dpPaperScope, dpCanvasFrames) {
    var p = dpPaperScope
      , directive = {
        link     : link,
        restrict : 'A'
      };
    return directive;

    function link(scope, el) {
      p.paperScope.setup(el[0]);
      dpCanvasPaper.init();
      dpCanvasService.init(p.projects[0]);
      dpCanvasTool.init();
      scope.$on('$destroy', destroy);
    }

    function destroy() {
      dpCanvasService.destroy();
      dpCanvasTool.destroy();
      dpCanvasFrames.destroy();
    }
  }
})();
