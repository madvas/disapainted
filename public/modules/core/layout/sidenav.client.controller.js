(function() {
  'use strict';

  angular
    .module('users')
    .controller('SidenavController', SidenavController);

  SidenavController.$inject = ['$scope', 'Authentication', '$mdSidenav'];

  /* @ngInject */
  function SidenavController($scope, Authentication, $mdSidenav) {
    /* jshint validthis: true */
    var vm = this;

    vm.auth = Authentication;
    vm.closeSidenav = closeSidenav;
    vm.activate = activate;

    activate();

    ////////////////

    function activate() {
      $scope.$on('$stateChangeSuccess', closeSidenav);
    }

    function closeSidenav() {
      $mdSidenav('rightSidenav').close();
    }

  }
})();
