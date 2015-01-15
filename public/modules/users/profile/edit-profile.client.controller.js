(function() {
  'use strict';

  angular
    .module('users')
    .controller('EditProfileController', EditProfileController);

  EditProfileController.$inject = [
    '$scope', '$state', 'Authentication', 'UsersConfig', 'dpToast', 'dpResource', '$analytics'
  ];

  /* @ngInject */
  function EditProfileController($scope, $state, Authentication, UsersConfig, dpToast, dpResource, $analytics) {
    /* jshint validthis: true */
    var vm = this;

    vm.user = Authentication.user;
    vm.UsersConfig = UsersConfig;
    vm.activate = activate;
    vm.saveProfile = saveProfile;

    activate();

    ////////////////

    function activate() {
      if (!Authentication.user) $state.go('userForm.signin');
      $scope.$parent.title = 'Edit your profile';
    }

    function saveProfile() {
      vm.user.save().then(function() {
        dpToast.success('Your profile was successfully updated');
        dpResource.add(vm.user, 'users');
        $state.go('viewUser', {userId : vm.user._id});
        $analytics.eventTrack('user-profile', {
          category : vm.user._id
        });
      });
    }
  }
})();
