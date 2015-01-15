(function() {
  'use strict';

  angular
    .module('core')
    .directive('dpThumb', dpThumb);

  dpThumb.$inject = ['Authentication'];

  /* @ngInject */
  function dpThumb(Authentication) {
    var directive
      , basePath = 'dist/thumbnails/';

    directive = {
      link     : link,
      restrict : 'A'
    };
    return directive;

    function link(scope, el, attr) {
      var type = attr.dpThumbType || 'anims'
        , path = basePath + type + '/'
        , clearCache = '';

      attr.$observe('dpThumb', function(id) {
        if (id === Authentication.user._id && Authentication.user.portraitChangeTime) {
          clearCache = '?' + Authentication.user.portraitChangeTime;
        }
        if (id) attr.$set('src', path + id + '.png' + clearCache);
      });

      el.on('error', function() {
        el[0].src = path + type + '_tpl.png';
      });
    }
  }
})();
