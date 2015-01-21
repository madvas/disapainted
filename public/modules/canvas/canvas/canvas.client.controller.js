(function() {
  'use strict';

  angular
    .module('canvas')
    .controller('CanvasController', CanvasController);

  CanvasController.$inject = [
    '$scope', 'Authentication', 'dpResource', '$stateParams', '$state', 'dpCanvas',
    'dpCanvasObjects', 'dpCanvasTool', 'dpCanvasConfig', 'dpCanvasFrames', '$mdDialog', '$analytics', 'dpToast'
  ];

  /* @ngInject */
  function CanvasController($scope, Authentication, dpResource, $stateParams, $state, dpCanvas, dpCanvasObjects,
                            dpCanvasTool, dpCanvasConfig, dpCanvasFrames, $mdDialog, $analytics, dpToast) {
    /* jshint validthis: true */
    var vm = this
      , _ = $scope;

    vm.current = {};
    vm.loading = true;
    vm.auth = Authentication;
    vm.dpConfig = dpCanvasConfig;
    vm.dpObjects = dpCanvasObjects;
    vm.newObjectType = 'Stickman';
    vm.c = dpCanvas;
    vm.t = dpCanvasTool;
    vm.f = dpCanvasFrames;
    vm.activate = activate;
    vm.isPublishable = isPublishable;
    vm.publishAnimDialog = publishAnimDialog;
    vm.choosePictureDialog = choosePictureDialog;
    vm.writeTextDialog = writeTextDialog;
    vm.importSVG = importSVG;
    vm.importSTK = importSTK;

    activate();

    ////////////////

    function activate() {
      var framesPromise;

      vm.f.init();
      dpResource.get($stateParams.animId).then(function(anim) {
        if (!vm.auth.user || vm.auth.user._id !== anim.creator) {
          $state.go('userForm.signin');
        }
        vm.current.anim = anim;
        framesPromise = dpResource.getFrames(vm.current.anim, true);
        vm.f.frames = framesPromise.$object;
        framesPromise.then(function(frames) {
          frames = _.sortBy(_.flatten(frames), 'order');
          if (!frames.length) {
            vm.f.newFrame();
          } else {
            vm.c.initLayers(frames);
            vm.f.currentFrameIndex = 0;
            vm.f.currentFrame = frames[0];
          }
          vm.loading = false;
          $scope.$watch('vm.f.currentFrame', function(newValue) {
            vm.c.activateLayer(newValue);
          });
        });
      });
    }

    function isPublishable() {
      return vm.f.framesCount >= 10;
    }

    function importSTK(files) {
      _.each(files, function(file) {
        if (file.name.split('.').pop() !== 'stk') {
          dpToast.danger(file.name + ' doesn\'t seem like .stk file. Stk files are created in Pivot Animator software');
          return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
          dpCanvasObjects.createObject('Import STK', {source : e.target.result});
        };
        reader.readAsArrayBuffer(file);
      });
    }

    function importSVG(files) {
      _.each(files, function(file) {
        if (file.type !== 'image/svg+xml') return;
        if (file.size > 50000) {
          dpToast.danger('Sorry, imported SVG file is too big!');
          return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
          dpCanvasObjects.createObject('Import SVG', {source : e.target.result});
        };
        reader.readAsText(file);
      });
    }

    function publishAnimDialog(evt) {
      vm.t.detachKeyEvents();
      vm.f.save().then(function() {
        $mdDialog.show({
          controller   : 'CanvasPublishAnimController',
          controllerAs : 'vm',
          templateUrl  : 'modules/canvas/canvas/dialogs/publish-canvas.client.view.html',
          targetEvent  : evt,
          hasBackdrop  : false
        }).then(function(publishData) {
          if (!publishData) return;
          vm.current.anim.post('publish', publishData).then(function() {
            dpResource.clear();
            $state.go('animations.list.content', {animId : vm.current.anim._id});
            $analytics.eventTrack('anim-publish', {
              category : vm.auth.user._id,
              label    : vm.current.anim._id
            });
          });
        }).finally(function() {
          vm.t.attachKeyEvents();
        });
      });
    }

    function choosePictureDialog(evt) {
      $mdDialog.show({
        controller   : 'CanvasPicturesController',
        controllerAs : 'vm',
        templateUrl  : 'modules/canvas/canvas/dialogs/pictures-canvas.client.view.html',
        targetEvent  : evt,
        hasBackdrop  : false
      }).then(function(answer) {
        dpCanvasObjects.createObject(answer.type, {source : answer.src});
      });
    }

    function writeTextDialog(evt) {
      vm.t.detachKeyEvents();
      $mdDialog.show({
        controller   : 'CanvasTextController',
        controllerAs : 'vm',
        templateUrl  : 'modules/canvas/canvas/dialogs/text-canvas.client.view.html',
        targetEvent  : evt,
        hasBackdrop  : false
      }).then(function(content) {
        if (!content) return;
        dpCanvasObjects.createObject('Text', {content : content});
      }).finally(function() {
        vm.t.attachKeyEvents();
      });
    }


  }
})();

