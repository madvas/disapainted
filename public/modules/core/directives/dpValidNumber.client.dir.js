(function() {
  'use strict';

  angular
    .module('core')
    .directive('dpValidNumber', dpValidNumber);

  dpValidNumber.$inject = [];

  /* @ngInject */
  function dpValidNumber() {
    var directive = {
      link     : link,
      restrict : 'A'
    };
    return directive;

    function link(scope, el, attr) {
      var keyCode = [
        8, 9, 37, 39, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 110
      ];
      el.bind('keydown', function(event) {
        if (!~keyCode.indexOf(event.which)) {
          scope.$apply(function() {
            scope.$eval(attr.dpValidNumber);
            event.preventDefault();
          });
          event.preventDefault();
        }
      });
    }
  }
})();
