(function() {
  'use strict';

  angular
    .module('animations')
    .controller('ContentAnimationController', ContentAnimationController);

  ContentAnimationController.$inject = [
    '$scope', '$location', 'dpResource', '$state', '$stateParams', '$anchorScroll',
    'dpPlayer', '$analytics', '$mdDialog', '$window'
  ];

  /* @ngInject */
  function ContentAnimationController($scope, $location, dpResource, $state, $stateParams, $anchorScroll, dpPlayer,
                                      $analytics, $mdDialog, $window) {
    /* jshint validthis: true */
    var vm = this;

    vm.current = $scope.current;
    vm.auth = $scope.auth;
    vm.player = dpPlayer;
    vm.absUrl = $location.absUrl().split('#')[0];
    vm.activate = activate;
    vm.getShareText = getShareText;
    vm.likeAnim = likeAnim;
    vm.gifDialog = gifDialog;
    vm.isWorkerSupported = isWorkerSupported;
    activate();

    ////////////////

    function activate() {
      $location.hash('top');
      $anchorScroll();

      vm.player.init();
      vm.loading = true;

      dpResource.get($stateParams.animId).then(function(anim) {
        var promise = dpResource.getFrames(anim);
        vm.current.anim = anim;
        vm.player.frames = promise.$object;
        promise.then(function() {
          vm.loading = false;
        });
        dpResource.get(anim.creator, 'users').then(function(user) {
          vm.current.creator = user;
        });
      });
    }

    function getShareText() {
      if (vm.current.anim) {
        return 'Animation: ' + vm.current.anim.title;
      }
    }

    function likeAnim() {
      var like = 1, action = 'like';
      if (!vm.auth.user) {
        $state.go('userForm.signin');
        return;
      }
      if (vm.current.anim.liked) {
        like = -like;
        action = 'unlike';
      }
      vm.current.anim.likesCount += like;
      vm.current.creator.likesCount += like;
      vm.current.anim.liked = !!~like;
      vm.current.anim.post(action, {}).then(function() {
        $analytics.eventTrack('anim-' + action, {
          category : vm.auth.user._id,
          label    : vm.current.anim._id
        });
      }, function() {
        vm.current.anim.likesCount += -like;
        vm.current.creator.likesCount += -like;
        vm.current.anim.liked = !vm.current.anim.liked;
      });
    }

    function gifDialog(evt) {
      $mdDialog.show({
        controller   : 'GifAnimController',
        controllerAs : 'vm',
        templateUrl  : 'modules/animations/view/dialogs/gif-anim.client.view.html',
        targetEvent  : evt,
        hasBackdrop  : false
      });
    }

    function isWorkerSupported() {
      return !!$window.Worker;
    }

  }
})();

