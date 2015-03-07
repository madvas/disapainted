(function() {
  'use strict';

  angular
    .module('core')
    .directive('dpThumb', dpThumb);

  dpThumb.$inject = ['CloudinaryUrl'];

  /* @ngInject */
  function dpThumb(CloudinaryUrl) {
    return {
      link     : link,
      restrict : 'A'
    };

    function link(scope, el, attr) {
      var type = attr.dpThumbType || 'anims';

      attr.$observe('dpThumbVersion', function(version, oldVersion) {
        if (version === oldVersion || !version) {
          return;
        }
        setPath(attr);
      });

      attr.$observe('dpThumb', function(id, oldId) {
        if (id === oldId || !id) {
          return;
        }
        setPath(attr);
      });

      el.on('error', function() {
        attr.$set('src', 'dist/thumbnails/' + type + '/' + type + '_tpl.png');
      });
    }

    function setPath(attr) {
      var newPath = CloudinaryUrl;
      if (attr.dpThumbVersion) {
        newPath = CloudinaryUrl + 'v' + attr.dpThumbVersion + '/';
      }
      attr.$set('src', newPath + attr.dpThumb + '.png');
    }
  }
})();
