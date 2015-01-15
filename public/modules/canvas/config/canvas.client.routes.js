(function() {
  'use strict';

  angular
    .module('canvas')
    .config(configure);

  configure.$inject = ['$stateProvider'];

  /* @ngInject */
  function configure($stateProvider) {
    $stateProvider
      .state('canvas', {
        url          : '/canvas/:animId',
        controller   : 'CanvasController',
        controllerAs : 'vm',
        templateUrl  : 'modules/canvas/canvas/canvas.client.view.html'
      });
  }
})();
