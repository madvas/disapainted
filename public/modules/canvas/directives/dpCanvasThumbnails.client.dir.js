(function() {
  'use strict';

  angular
    .module('canvas')
    .directive('dpCanvasThumbnails', dpCanvasThumbnails);

  dpCanvasThumbnails.$inject = [];

  /* @ngInject */
  function dpCanvasThumbnails() {
    var directive = {
      link     : link,
      restrict : 'A'
    };
    return directive;

    function link(scope, el, attr) {
      var frameWidth, framesCount,
        rowWidth = el.prop('offsetWidth') - 30;
      attr.$observe('dpCurrentFrameIndex', function(frameIndex) {
        framesCount = attr.dpFramesCount;
        if (!frameWidth) {
          frameWidth = el.find('li').eq(0).prop('offsetWidth') + 10;
        }
        el.scrollLeft(frameIndex / (framesCount - 1) * (framesCount * frameWidth - rowWidth));
      });
    }
  }
})();
