(function() {
  'use strict';

  angular
    .module('canvas')
    .controller('CanvasTextController', CanvasTextController);

  CanvasTextController.$inject = ['$mdDialog'];

  /* @ngInject */
  function CanvasTextController($mdDialog) {
    /* jshint validthis: true */
    var vm = this;

    vm.answer = answer;

    ////////////////

    function answer(ans) {
      $mdDialog.hide(ans);
    }
    
  }
})();
