(function() {
  'use strict';

  angular
    .module('animations')
    .directive('dpAnimLoader', dpAnimLoader);

  dpAnimLoader.$inject = ['AnimsConfig', '$window', '$rootScope'];

  /* @ngInject */
  function dpAnimLoader(AnimsConfig, $window, $rootScope) {
    var directive
      , _ = $rootScope
      , ratio = AnimsConfig.canvas.height / AnimsConfig.canvas.width
      , styles = ['md-primary', 'md-accent', 'md-warn'];

    directive = {
      link     : link,
      restrict : 'A',
      template : '<div layout="column" layout-align="center center" class="anim-loading-wrap">' +
        '<md-progress-circular md-mode="indeterminate"></md-progress-circular>' +
        '<span class="font-sm mar-top-10">Preparing animation</span>' +
        '</div>'
    };
    return directive;

    function link(scope, el) {
      angular.element($window).bind('resize', _.partial(setElHeight, el));
      setElHeight(el);
      el.find('md-progress-circular').removeClass(styles.join(' ')).addClass(styles[_.random(styles.length - 1)]);
    }

    function setElHeight(el) {
      el.css('height', (el.prop('clientWidth') * ratio) + 'px');
    }
  }
})();
