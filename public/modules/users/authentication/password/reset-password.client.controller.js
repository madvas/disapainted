(function() {
  'use strict';

  angular
    .module('users')
    .controller('ResetPasswordController', ResetPasswordController);

  ResetPasswordController.$inject = [
    '$scope', '$stateParams', 'Restangular', 'Authentication', '$state', 'dpToast', '$analytics'
  ];

  /* @ngInject */
  function ResetPasswordController($scope, $stateParams, Restangular, Authentication, $state, dpToast, $analytics) {
    /* jshint validthis: true */
    var vm = this;

    vm.activate = activate;
    vm.resetUserPassword = resetUserPassword;

    activate();

    ////////////////

    function activate() {
      if (Authentication.user) $state.go('home');
      $scope.$parent.title = 'Reset your password';
    }

    function resetUserPassword() {
      Restangular.all('auth/reset/' + $stateParams.token).post({newPass : vm.newPass}).then(function() {
        dpToast.success('Your password has been successfully updated, you can now sign in');
        $state.go('userForm.signin');
        $analytics.eventTrack('user-pass-reset', {
          category : $stateParams.token
        });
      });
    }
  }
})();
