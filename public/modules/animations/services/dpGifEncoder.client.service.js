(function() {
  'use strict';

  angular
    .module('animations')
    .factory('dpGifEncoder', dpGifEncoder);

  dpGifEncoder.$inject = ['$rootScope', 'AnimsConfig', '$window', '$q', '$stateParams'];

  /* @ngInject */
  function dpGifEncoder($rootScope, AnimsConfig, $window, $q, $stateParams) {
    var me, ctx
      , _ = $rootScope
      , height = AnimsConfig.canvas.height
      , width = AnimsConfig.canvas.width
      , worker = new Worker('modules/animations/workers/dpGifEncoder.client.worker.js')
      , canvas = angular.element('<canvas/>')
      , lastReq = {};

    canvas.css('display', 'none');
    canvas[0].width = width;
    canvas[0].height = height;

    ctx = canvas[0].getContext('2d');
    ctx.fillStyle = 'rgb(255,255,255)';

    me = {
      encode        : encode,
      progressValue : 0
    };

    return me;

    ////////////////

    function encode(frames, delays) {
      var imageData = []
        , deferred = $q.defer()
        , imgPromises = [];

      if (lastReq.animId === $stateParams.animId && lastReq.gif) {
        deferred.resolve(lastReq.gif);
        return deferred.promise;
      }

      me.progressValue = 0;
      lastReq = {
        animId : $stateParams.animId,
        gif    : false
      };

      _.each(frames, function(frame) {
        var imgDeferred = $q.defer()
          , img = new Image();

        img.src = frame.rasterized;
        img.addEventListener('load', function(e) {
          imgDeferred.resolve(e.target);
        });
        imgPromises.push(imgDeferred.promise);
        imgDeferred.promise.then(function(image) {
          ctx.clearRect(0, 0, width, height);
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0);
          imageData.push({
            order : frame.order,
            data  : ctx.getImageData(0, 0, width, height).data
          });
        });
      });


      worker.addEventListener('message', function(msg) {
        switch (msg.data.type) {
          case 'progress' :
            me.progressValue = msg.data.value;
            break;
          case 'result' :
            var dataUrl = $window.btoa(msg.data.value)
              , gif = 'data:image/gif;base64,' + dataUrl;
            if (dataUrl.length <= 5) {
              deferred.reject('Generated gif was too short');
            } else {
              deferred.resolve(gif);
              lastReq.gif = gif;
            }
            break;
        }

      }, false);

      worker.addEventListener('error', function(err) {
        deferred.reject(err.message);
      }, false);

      $q.all(imgPromises).then(function() {
        imageData = _.pluck(_.sortBy(imageData, 'order'), 'data');
        worker.postMessage([imageData, delays, width, height]);
      });


      return deferred.promise;
    }
  }
})();
