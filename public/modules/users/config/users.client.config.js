(function() {
  'use strict';

  angular
    .module('users')
    .run(run);

  run.$inject = ['Restangular', 'Authentication'];

  /* @ngInject */
  function run(Restangular, Authentication) {
    Authentication.user = Restangular.restangularizeElement(null, Authentication.user, 'users');
  }

})();
