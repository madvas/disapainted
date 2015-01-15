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

    vm.charsLeft = charsLeft;
    vm.answer = answer;
    vm.AnimsConfig = AnimsConfig;

    ////////////////


    function charsLeft(isValid) {
      if (!isValid) return 0;
      if (!vm.desc) return AnimsConfig.descMaxLength;
      return AnimsConfig.descMaxLength - vm.desc.length;
    }

    function answer(ans) {
      $mdDialog.hide(ans);
    }

  }
})();
