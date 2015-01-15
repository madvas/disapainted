(function() {
  'use strict';

  angular
    .module('users')
    .controller('HeaderController', HeaderController);

  HeaderController.$inject = ['Authentication', 'dpResource', '$mdSidenav'];

  /* @ngInject */
  function HeaderController(Authentication, dpResource, $mdSidenav) {
    /* jshint validthis: true */
    var vm = this;

    vm.auth = Authentication;
    vm.logout = logout;
    vm.openSidenav = openSidenav;

    ////////////////

    function logout() {
      dpResource.clear();
    }

    function openSidenav() {
      $mdSidenav('rightSidenav').toggle();
    }
  }
})();
