(function() {
  'use strict';

  angular
    .module('users')
    .controller('ForgotPasswordController', ForgotPasswordController);

  ForgotPasswordController.$inject = ['$scope', 'Restangular', 'Authentication', '$state', 'dpToast', '$analytics'];

  /* @ngInject */
  function ForgotPasswordController($scope, Restangular, Authentication, $state, dpToast, $analytics) {
    /* jshint validthis: true */
    var vm = this;

    vm.activate = activate;
    vm.askForPasswordReset = askForPasswordReset;

    activate();

    ////////////////

    function activate() {
      if (Authentication.user) $state.go('/');
      $scope.$parent.title = 'Restore password';
    }

    function askForPasswordReset() {
      Restangular.all('auth/forgot').post({email : vm.email}).then(function() {
        dpToast.success('Your password was reset. Please check your email');
        $state.go('home');
        $analytics.eventTrack('user-pass-forgot', {
          category : vm.email
        });
      });
    }
  }
})();
