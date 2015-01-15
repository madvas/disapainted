(function() {
  'use strict';

  angular
    .module('canvas')
    .factory('dpCanvasFrames', dpCanvasFrames);

  dpCanvasFrames.$inject = ['$stateParams', '$rootScope', 'AnimsConfig', 'dpResource', 'dpToast', '$q', '$interval',
                            '$state', 'dpObjectData', '$timeout'];

  /* @ngInject */
  function dpCanvasFrames($stateParams, $rootScope, AnimsConfig, dpResource, dpToast, $q, $interval, $state,
                          dpObjectData, $timeout) {
    var me, saveInterval, removedCount, playDeferred
      , unwatchFuncs = []
      , _ = $rootScope;

    me = {
      frames         : {},
      currentFrame   : {},
      clipboardFrame : false,
      framesCount    : 0,
      repeat         : true,
      playing        : false,
      init           : init,
      save           : save,
      next           : next,
      play           : play,
      stop           : stop,
      newFrame       : newFrame,
      pasteFrame     : pasteFrame,
      removeFrame    : removeFrame,
      cloneFrame     : cloneFrame,
      getDirty       : getDirty,
      setDirty       : setDirty,
      isClean        : isClean,
      destroy        : destroy
    };

    return me;

    ////////////////

    function init() {
      me.frames = {};
      me.currentFrame = {};
      me.clipboardFrame = false;
      me.framesCount = 0;
      me.playing = false;
      removedCount = 0;
      saveInterval = $interval(me.save, 300000);

      unwatchFuncs.push($rootScope.$watch(function() {
        return _.keys(me.frames).length;
      }, function(newValue) {
        me.framesCount = newValue;
      }));

      unwatchFuncs.push($rootScope.$watch(function() {
        return me.currentFrameIndex;
      }, function(newValue, oldValue) {
        me.currentFrame = me.frames[newValue];
        me.prevFrame = me.frames[oldValue];
      }));

      unwatchFuncs.push($rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState) {
        if (fromState.name === 'canvas') {
          if (!me.isClean()) {
            event.preventDefault();
            me.save().then(_.partial($state.go, toState, toParams));
          }
        }
      }));

    }

    function save() {
      var frames, deferred, promise, promises = []
        , removedBefore = removedCount
        , anim = dpResource.get($stateParams.animId).$object;

      if (me.isClean()) {
        deferred = $q.defer();
        deferred.resolve();
        return deferred.promise;
      }

      frames = _.map(me.getDirty(), function(dirtyFrame) {
        var frame = _.omit(dirtyFrame, 'layer', 'dirty', 'rasterized');
        if (dirtyFrame.order === 0) {
          frame.thumbnail = dirtyFrame.rasterized;
        }
        frame.objectData = dpObjectData.pack(dirtyFrame.objectData);
        return frame;
      });
      dpToast.info('Saving your precious animation...');

      _.each(_.chunk(frames, AnimsConfig.framesPageSize), function(framesChunk) {
        promise = anim.post('edit/frames', framesChunk);
        me.setDirty(framesChunk, false);
        promises.push(promise);
        promise.then(_.noop, function() {
          me.setDirty(framesChunk, true);
        });
      });
      if (removedCount > 0) {
        promise = anim.customDELETE('edit/frames', {
          fromOrder : me.framesCount,
          count     : removedCount
        });
        removedCount = 0;
        promise.then(_.noop, function() {
          removedCount = removedBefore;
        });
        promises.push(promise);
      }

      promises = $q.all(promises);

      promises.then(function() {
        dpToast.success('Great! Your animation was successfully saved');
      });

      return promises;
    }

    function newFrame() {
      var frame;
      if (me.framesCount) {
        if (me.framesCount === AnimsConfig.framesLimit) {
          dpToast.info('WOW! You have made longest animation we can save! It\'s time to publish!');
          return;
        } else if (me.framesCount / AnimsConfig.framesLimit === 0.8) {
          dpToast.warning('You\'re getting close to our limits! ' +
            'Animations can have up to ' + AnimsConfig.framesLimit + ' frames', {timeout : 7000});
        }


        frame = me.cloneFrame(me.frames[me.framesCount - 1]);
        frame.order = me.framesCount;
        me.currentFrameIndex = frame.order;
      } else {
        frame = {
          animation : $stateParams.animId,
          order     : 0,
          repeat    : 1
        };
        me.currentFrameIndex = frame.order;
        me.currentFrame = frame;
      }
      frame.dirty = true;
      me.frames[frame.order] = frame;
      removedCount--;
    }

    function next(step) {
      var framesCount = _.keys(me.frames).length;
      if (step < 0) {
        if (me.currentFrameIndex > 0) {
          me.currentFrameIndex += step;
        } else if (me.repeat) {
          me.currentFrameIndex = framesCount - 1;
        } else {
          stop();
          return;
        }
      } else {
        if (me.currentFrameIndex < framesCount - 1) {
          me.currentFrameIndex += step;
        } else if (me.repeat) {
          me.currentFrameIndex = 0;
        } else {
          stop();
          return;
        }
      }
      playNext();
    }

    function playNext() {
      if (me.playing) {
        $timeout(_.partial(next, 1), 100 * me.frames[me.currentFrameIndex].repeat);
      }
    }

    function play() {
      me.playing = true;
      playNext();
      playDeferred = $q.defer();
      return playDeferred.promise;
    }

    function stop() {
      me.playing = false;
      playDeferred.resolve();
    }

    function removeFrame(removedFrame) {
      if (me.framesCount === 1) return;
      delete me.frames[removedFrame.order];
      removedFrame.layer.remove();
      _.each(me.frames, function(frame, order) {
        if (order <= removedFrame.order) return;
        me.frames[order - 1] = frame;
        frame.order--;
        frame.dirty = true;
      });
      delete me.frames[me.framesCount - 1];
      if (me.frames[me.currentFrameIndex]) {
        me.currentFrame = me.frames[me.currentFrameIndex];
      } else {
        me.currentFrameIndex--;
      }
      removedCount++;
    }

    function pasteFrame(frame) {
      if (!frame) return;
      var pastedFrame = me.cloneFrame(frame);
      me.currentFrame.layer.removeChildren();
      pastedFrame.layer = me.currentFrame.layer;
      pastedFrame.order = me.currentFrame.order;
      pastedFrame.dirty = true;
      me.frames[me.currentFrame.order] = me.currentFrame = pastedFrame;
    }

    function getDirty() {
      return _.filter(_.toArray(me.frames), {dirty : true});
    }

    function setDirty(frames, dirty) {
      frames = _.isArray(frames) ? frames : [frames];
      _.each(frames, function(frame) {
        me.frames[frame.order].dirty = dirty;
      });
    }

    function cloneFrame(frame) {
      var clone = _.clone(_.omit(frame, 'layer'));
      clone.repeat = 1;
      return clone;
    }

    function isClean() {
      return _.isEmpty(me.getDirty()) && removedCount <= 0;
    }

    function destroy() {
      _.invoke(unwatchFuncs, 'call');
      unwatchFuncs = [];
      $interval.cancel(saveInterval);
    }

  }
})();
