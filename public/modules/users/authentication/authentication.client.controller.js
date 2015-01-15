(function() {
  'use strict';

  angular
    .module('users')
    .controller('AuthenticationController', AuthenticationController);

  AuthenticationController.$inject = [
    '$scope', 'Restangular', 'Authentication', '$state', 'dpResource', 'dpBrowseHistory', '$analytics'
  ];

  /* @ngInject */
  function AuthenticationController($scope, Restangular, Authentication, $state, dpResource, dpBrowseHistory,
                                    $analytics) {
    /* jshint validthis: true */
    var vm = this;

    vm.activate = activate;
    vm.auth = Authentication;
    vm.sign = sign;
    activate();

    ////////////////

    function activate() {
      if (vm.auth.user) $state.go('viewUser', {userId : vm.auth.user._id});
      $scope.$parent.title = 'Join us using your social accounts';
    }

    function sign(type) {
      Restangular.all('auth/sign' + type).post(vm.credentials).then(function(user) {
        $analytics.eventTrack('sign' + type, {
          category : user._id
        });
        vm.auth.user = Restangular.restangularizeElement(null, user, 'users');
        dpResource.clear();
        dpBrowseHistory.back();
      });
    }

  }
})();
