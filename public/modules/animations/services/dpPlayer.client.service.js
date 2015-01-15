(function() {
  'use strict';

  angular
    .module('animations')
    .factory('dpPlayer', dpPlayer);

  dpPlayer.$inject = ['$rootScope', '$localStorage', '$timeout'];

  /* @ngInject */
  function dpPlayer($rootScope, $localStorage, $timeout) {
    var me
      , _ = $rootScope
      , settings = $localStorage.$default({
        player : {
          speed     : 5,
          repeat    : false,
          backwards : false
        }
      }).player;

    me = {
      currentFrame : 0,
      frames       : {},
      settings     : settings,
      init         : init,
      next         : next,
      play         : play,
      stop         : stop,
      lastFrame    : lastFrame
    };

    return me;

    ////////////////

    function init() {
      me.currentFrame = 0;
      me.frames = {};
    }

    function next(step) {
      step = me.settings.backwards ? -step : step;

      if (step < 0) {
        if (me.currentFrame > 0) {
          me.currentFrame += step;
        } else if (me.settings.repeat) {
          me.currentFrame = me.lastFrame();
        } else {
          stop();
          return;
        }
      } else {
        if (me.currentFrame < me.lastFrame()) {
          me.currentFrame += step;
        } else if (me.settings.repeat) {
          me.currentFrame = 0;
        } else {
          stop();
          return;
        }
      }
      playNext();
    }

    function playNext(instant) {
      if (me.playing) {
        var delay = instant ? 0 : (11 - me.settings.speed) * 50 - ((11 - me.settings.speed) * 15);
        $timeout(_.partial(me.next, 1), delay * me.frames[me.currentFrame].repeat);
      }
    }

    function play() {
      if (!me.playing) {
        if (me.currentFrame === me.lastFrame() && !me.settings.backwards) {
          me.currentFrame = 0;
        } else if (me.currentFrame === 0 && me.settings.backwards) {
          me.currentFrame = me.lastFrame();
        }
      }
      me.playing = !me.playing;
      playNext(true);
    }

    function stop() {
      me.playing = false;
    }

    function lastFrame() {
      return _.keys(me.frames).length - 1;
    }
  }
})();
