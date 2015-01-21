(function() {
  'use strict';

  angular
    .module('animations')
    .factory('dpObjectData', dpObjectData);

  dpObjectData.$inject = ['$rootScope', 'dpPaperScope', '$q', 'jsonpack'];

  /* @ngInject */
  function dpObjectData($rootScope, dpPaperScope, $q, jsonpack) {
    var me
      , _ = $rootScope
      , p = dpPaperScope;

    me = {
      unpackFrames : unpackFrames,
      pack         : pack,
      unpack       : unpack
    };

    return me;

    ////////////////

    function unpackFrames(frames) {
      _.each(frames, function(frame) {
        frame.objectData = unpack(frame.objectData);
      });
      return rasterize(frames);
    }

    function unpack(objectData) {
      return jsonpack.unpack(objectData);
    }

    function pack(objectData) {
      recurseObjectData(objectData, function(obj) {
        if (obj.data) {
          delete obj.data.handleId;
          delete obj.data.scale;
          delete obj.data.stkId;
        }
      });
      return jsonpack.pack(jsonpack.JSON.stringify(objectData));
    }

    function rasterize(frames) {
      var promise
        , promises = []
        , project;

      _.each(frames, function(frame) {
        project = new p.Project();
        project.activeLayer.importJSON(frame.objectData);
        promise = project.activeLayer.dpGetDataURL();
        promises.push(promise);
        promise.then(_.partial(assignFrame, frame, project));
      });
      if (promises.length) {
        promises = $q.all(promises);
      }

      return promises;
    }

    function recurseObjectData(object, iterator) {
      function recurse(obj) {
        if (_.isArray(obj)) {
          recurse(obj[1]);
        } else if (obj.children) {
          _.each(obj.children, function(child) {
            iterator(child[1]);
            recurse(child[1]);
          });
        }
      }

      recurse(object);
    }

    function assignFrame(frame, project, rasterized) {
      frame.rasterized = rasterized;
      project.remove();
    }

  }
})();
