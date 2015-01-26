(function() {
  'use strict';

  angular
    .module('canvas')
    .controller('CanvasPublishAnimController', CanvasPublishAnimController);

  CanvasPublishAnimController.$inject = ['AnimsConfig', '$mdDialog'];

  /* @ngInject */
  function CanvasPublishAnimController(AnimsConfig, $mdDialog) {
    /* jshint validthis: true */
    var vm = this;

    vm.answer = answer;
    vm.AnimsConfig = AnimsConfig;

    ////////////////

    function answer(ans) {
      $mdDialog.hide(ans);
    }

  }
})();
