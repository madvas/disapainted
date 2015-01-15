(function() {
  'use strict';

  angular
    .module('animations')
    .config(configure);

  configure.$inject = ['$stateProvider'];

  /* @ngInject */
  function configure($stateProvider) {
    $stateProvider
      .state('animations', {
        abstract     : true,
        url          : '/animations',
        controller   : 'ViewAnimationController',
        controllerAs : 'vm',
        templateUrl  : 'modules/animations/view/view-anim.client.view.html'
      })
      .state('animations.list', {
        abstract : true,
        views    : {
          list : {
            controller   : 'ListAnimationsController',
            controllerAs : 'vm',
            templateUrl  : 'modules/animations/list/list-anims.client.view.html'
          },
          ''   : {
            template : '<div data-ui-view></div>'
          }
        }
      })
      .state('animations.list.content', {
        url          : '/:animId',
        controller   : 'ContentAnimationController',
        controllerAs : 'vm',
        templateUrl  : 'modules/animations/view/content-anim.client.view.html'
      });
  }
})();
