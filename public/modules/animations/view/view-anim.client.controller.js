(function() {
  'use strict';

  angular
    .module('animations')
    .controller('ViewAnimationController', ViewAnimationController);

  ViewAnimationController.$inject = ['$scope', 'Authentication'];

  /* @ngInject */
  function ViewAnimationController($scope, Authentication) {
    /* jshint validthis: true */
    var vm = this;
    $scope.auth = Authentication;
    $scope.current = {};

    ////////////////
  }
})();
