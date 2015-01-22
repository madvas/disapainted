(function() {
  'use strict';

  angular
    .module('canvas')
    .controller('CanvasStickfigureController', CanvasStickfigureController);

  CanvasStickfigureController.$inject = ['$rootScope', 'AnimsConfig', '$mdDialog'];

  /* @ngInject */
  function CanvasStickfigureController($rootScope, AnimsConfig, $mdDialog) {
    /* jshint validthis: true */
    var vm = this
      , _ = $rootScope;

    vm.figures = AnimsConfig.canvas.figures;
    vm.figuresPath = AnimsConfig.canvas.figuresPath;
    vm.selected = {};
    vm.answer = answer;
    vm.pageSize = 24;
    vm.toggleSelect = toggleSelect;
    vm.selectedCount = selectedCount;

    ////////////////

    function toggleSelect(figureName) {
      if (vm.selected[figureName]) {
        delete vm.selected[figureName];
      } else {
        vm.selected[figureName] = true;
      }
    }

    function selectedCount() {
      return _.keys(vm.selected).length;
    }

    function answer(ans) {
      $mdDialog.hide(_.keys(ans));
    }

  }
})();
