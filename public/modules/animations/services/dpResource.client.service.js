(function() {
  'use strict';

  angular
    .module('animations')
    .factory('dpResource', dpResource);

  dpResource.$inject = [
    '$rootScope', 'Restangular', '$localStorage', '$sessionStorage', '$q', 'AnimsConfig', 'dpObjectData',
    '$interval'
  ];

  /* @ngInject */
  function dpResource($rootScope, Restangular, $localStorage, $sessionStorage, $q, AnimsConfig, dpObjectData,
                      $interval) {
    var me
      , _ = $rootScope;
    $sessionStorage.anims = $sessionStorage.anims || {};
    $sessionStorage.users = $sessionStorage.users || {};

    me = {
      'get'     : get,
      'set'     : set,
      add       : add,
      getFrames : getFrames,
      clear     : clear
    };

    init();
    return me;

    ////////////////

    function init() {
      $interval(function() {
        $sessionStorage.users = {};
      }, 900000); // Wipe users cache every 15 minutes
    }

    function get(id, type) {
      type = type || 'anims';
      var item = $sessionStorage[type][id];
      if (item) {
        var deferred = $q.defer();
        item = Restangular.restangularizeElement(null, item, type);
        deferred.resolve(item);
        return _.extend(deferred.promise, {$object : item});
      }
      item = Restangular.one(type, id).get();
      $sessionStorage[type][id] = item.$object;
      return item;

    }

    function add(items, type) {
      items = _.isArray(items) ? items : [items];
      _.merge($sessionStorage[type || 'anims'], _.indexBy(items, '_id'));
    }

    function set(items, type) {
      $sessionStorage[type || 'anims'] = _.indexBy(items, '_id');
    }

    function getFrames(anim, edit) {
      var frames = {}
        , promises = []
        , allPromises
        , pageSize = AnimsConfig.framesPageSize
        , route = edit ? 'edit/frames' : 'frames';

      $localStorage.frames = $localStorage.frames || {};

      _.times(Math.ceil(anim.framesCount / pageSize), function(n) {
        var promise = anim.getList(route, {offset : n * pageSize});
        promise.then(function(loadedFrames) {
          _.extend(frames, _.indexBy(loadedFrames, 'order'));
          return dpObjectData.unpackFrames(loadedFrames, frames);
        });
        promises.push(promise);
      });

      allPromises = $q.all(promises);
      allPromises.then(function() {
        _.each(frames, function(frame, key) {
          if (!frame.objectData) {
            frames[key].objectData = frames[frame.order - 1].objectData;
          }
          return frame;
        });
        dpObjectData.rasterize(frames);
      });
      allPromises.$object = frames;
      return allPromises;
    }

    function clear() {
      $sessionStorage.anims = {};
      $sessionStorage.users = {};
    }
  }
})();
