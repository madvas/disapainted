(function() {
  'use strict';

  angular
    .module('canvas')
    .controller('GifAnimController', GifAnimController);

  GifAnimController.$inject = [
    '$mdDialog', 'dpPlayer', 'dpGifEncoder', 'dpToast', '$analytics', 'Authentication', '$stateParams'
  ];

  /* @ngInject */
  function GifAnimController($mdDialog, dpPlayer, dpGifEncoder, dpToast, $analytics, Authentication, $stateParams) {
    /* jshint validthis: true */
    var vm = this
      , animId = $stateParams.animId
      , userId = Authentication.user._id;

    vm.answer = answer;
    vm.dpGifEncoder = dpGifEncoder;
    vm.framesCount = dpPlayer.lastFrame() + 1;
    activate();

    ////////////////

    function activate() {
      vm.loading = true;
      dpGifEncoder.encode(dpPlayer.frames, dpPlayer.getDelays()).then(function(imgData) {
        vm.gif = imgData;
        vm.loading = false;
        $analytics.eventTrack('gif-success', {
          category : userId,
          label    : animId
        });
      }, function(err) {
        dpToast.danger('Sorry, I was unable to generate gif from this animation');
        $analytics.eventTrack('gif-err', {
          category : animId,
          label    : err
        });
        answer();
      });
    }

    function answer() {
      $mdDialog.hide();
    }

  }
})();
