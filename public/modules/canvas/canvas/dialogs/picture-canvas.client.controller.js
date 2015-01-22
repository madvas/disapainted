(function() {
  'use strict';

  angular
    .module('canvas')
    .controller('CanvasPictureController', CanvasPictureController);

  CanvasPictureController.$inject = ['$rootScope', 'AnimsConfig', '$mdDialog'];

  /* @ngInject */
  function CanvasPictureController($rootScope, AnimsConfig, $mdDialog) {
    /* jshint validthis: true */
    var vm = this
      , _ = $rootScope;

    vm.pictures = AnimsConfig.canvas.pictures;
    vm.answer = answer;
    vm.isSvg = isSvg;
    vm.pageSize = 20;

    ////////////////

    function isSvg(pic) {
      return !!~pic.indexOf('.svg');
    }

    function answer(src, isSvg) {
      if (isSvg) {
        src = _.clone(src.target.nearestViewportElement || src.target);
      }
      $mdDialog.hide(src);
    }

  }
})();
