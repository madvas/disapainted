(function() {
  'use strict';

  angular
    .module('users')
    .directive('dpRepeatPassword', dpRepeatPassword);

  dpRepeatPassword.$inject = ['$parse'];

  /* @ngInject */
  function dpRepeatPassword($parse) {
    var directive = {
      link     : link,
      restrict : 'A',
      require  : 'ngModel'
    };
    return directive;

    function link(scope, el, attrs, ctrl) {
      scope.$watch(function() {
        return $parse(attrs.dpRepeatPassword)(scope) === ctrl.$modelValue;
      }, function(currentValue) {
        ctrl.$setValidity('mismatch', currentValue);
      });
    }
  }
})();
