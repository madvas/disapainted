(function() {
  'use strict';

  angular
    .module('animations')
    .filter('dpRasterize', dpRasterize);

  dpRasterize.$inject = ['$rootScope'];

  /* @ngInject */
  function dpRasterize($rootScope) {
    var _ = $rootScope
      , emptyFrame = 'dist/thumbnails/anims/anims_tpl.png';

    return function(frame) {
      if (_.isEmpty(frame) || _.isEmpty(frame.rasterized)) {
        return emptyFrame;
      }

      return frame.rasterized.substring(0, 4) === 'data' ? frame.rasterized :
        'data:image/png;base64,' + frame.rasterized;
    };
  }
})();
