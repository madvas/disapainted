(function() {
  'use strict';

  angular
    .module('core')
    .controller('AboutController', AboutController);

  AboutController.$inject = ['$scope'];

  /* @ngInject */
  function AboutController($scope)
  {
    /* jshint validthis: true */
    var vm = this;

    vm.activate = activate;

    activate();

    ////////////////

    function activate() {
      $scope.$parent.title = 'About Us';
    }
  }
})();
