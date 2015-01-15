(function() {
  'use strict';

  angular
    .module('users')
    .config(configure);

  configure.$inject = ['$stateProvider'];

  /* @ngInject */
  function configure($stateProvider) {
    $stateProvider
      .state('userForm', {
        abstract    : true,
        templateUrl : 'modules/users/layout/form-user.client.view.html'
      })
      .state('userForm.profile', {
        url          : '/settings/profile',
        controller   : 'EditProfileController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/profile/edit-profile.client.view.html',

      })
      .state('userForm.password', {
        url          : '/settings/password',
        controller   : 'ChangePasswordController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/profile/change-password.client.view.html'
      })
      .state('userForm.signup', {
        url          : '/signup',
        controller   : 'AuthenticationController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/authentication/signup.client.view.html'
      })
      .state('userForm.signin', {
        url          : '/signin',
        controller   : 'AuthenticationController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/authentication/signin.client.view.html'
      })
      .state('userForm.forgot', {
        url          : '/password/forgot',
        controller   : 'ForgotPasswordController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/authentication/password/forgot-password.client.view.html'
      })
      .state('userForm.reset-invalid', {
        url         : '/password/reset/invalid',
        templateUrl : 'modules/users/authentication/password/reset-password-invalid.client.view.html'
      })
      .state('userForm.reset', {
        url          : '/password/reset/:token',
        controller   : 'ResetPasswordController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/authentication/password/reset-password.client.view.html'
      })
      .state('viewUser', {
        url          : '/users/:userId',
        controller   : 'AnimsUserController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/animations/anims-user.client.view.html'
      })
      .state('portrait', {
        url          : '/users/:userId/portrait',
        controller   : 'PortraitController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/portrait/portrait-user.client.view.html'
      });
  }
})();
