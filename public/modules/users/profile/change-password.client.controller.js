(function() {
  'use strict';

  angular
    .module('users')
    .controller('ChangePasswordController', ChangePasswordController);

  ChangePasswordController.$inject = ['$scope', '$state', 'Authentication', 'dpToast', '$analytics'];

  /* @ngInject */
  function ChangePasswordController($scope, $state, Authentication, dpToast, $analytics) {
    /* jshint validthis: true */
    var vm = this;

    vm.user = Authentication.user;
    vm.activate = activate;
    vm.changePassword = changePassword;

    activate();

    ////////////////

    function activate() {
      if (!Authentication.user) $state.go('userForm.signin');
      $scope.$parent.title = 'Change password';
    }

    function changePassword() {
      vm.user.post('password', vm.passwordDetails).then(function() {
        dpToast.success('Your password was successfully changed');
        $state.go('viewUser', {userId : vm.user._id});
        $analytics.eventTrack('user-pass-change', {
          category : vm.user._id
        });
      });
    }
  }
})();
