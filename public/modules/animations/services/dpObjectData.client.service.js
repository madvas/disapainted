(function() {
  'use strict';

  angular
    .module('animations')
    .factory('dpObjectData', dpObjectData);

  dpObjectData.$inject = ['$rootScope', 'dpPaperScope', 'jsonpack'];

  /* @ngInject */
  function dpObjectData($rootScope, dpPaperScope, jsonpack) {
    var me
      , _ = $rootScope
      , p = dpPaperScope;

    me = {
      unpackFrames : unpackFrames,
      pack         : pack,
      unpack       : unpack,
      rasterize    : rasterize
    };

    return me;

    ////////////////

    function unpackFrames(frames) {
      _.each(frames, function(frame) {
        if (frame.objectData) {
          frame.objectData = unpack(frame.objectData);
        }
      });
    }

    function unpack(objectData) {
      return jsonpack.unpack(objectData);
    }

    function pack(objectData) {
      objectData = clearDataProperties(objectData);
      return jsonpack.pack(jsonpack.JSON.stringify(objectData));
    }

    function rasterize(frames) {
      var project = new p.Project();
      var activeLayer = project.activeLayer;
      _.each(frames, function(frame) {
        activeLayer.importJSON(frame.objectData);
        activeLayer.dpGetBackground().opacity = 1;
        frame.rasterized = activeLayer.dpGetDataURL();
        activeLayer.removeChildren();
      });
      project.remove();
    }

    function clearDataProperties(objectData) {
      recurseObjectData(objectData, function(obj) {
        if (obj.data) {
          delete obj.data.handleId;
          delete obj.data.scale;
          delete obj.data.stkId;
        }
      });
      return objectData;
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
  }
})();
