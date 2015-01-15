(function() {
  'use strict';

  angular
    .module('core')
    .config(configure);

  configure.$inject = ['$stateProvider', '$urlRouterProvider'];

  /* @ngInject */
  function configure($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/');

    $stateProvider
      .state('home', {
        url          : '/',
        controller   : 'HomeController',
        controllerAs : 'vm',
        templateUrl  : 'modules/core/home/home.client.view.html'
      })
      .state('userForm.contact', {
        url          : '/contact',
        controller   : 'ContactController',
        controllerAs : 'vm',
        templateUrl  : 'modules/core/contact/contact.client.view.html'
      })
      .state('userForm.about', {
        url          : '/about',
        controller   : 'AboutController',
        controllerAs : 'vm',
        templateUrl  : 'modules/core/about/about.client.view.html'
      });
  }
})();
