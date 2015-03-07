(function() {
  'use strict';

  angular
    .module('users')
    .controller('PortraitController', PortraitController);

  PortraitController.$inject = [
    '$scope', '$stateParams', 'Authentication', '$state', 'dpPaperScope', 'dpPortraitTool', 'dpToast', '$analytics'
  ];

  /* @ngInject */
  function PortraitController($scope, $stateParams, Authentication, $state, dpPaperScope, dpPortraitTool, dpToast,
                              $analytics) {
    /* jshint validthis: true */
    var vm = this
      , p = dpPaperScope
      , _ = $scope
      , imgSrc = 'dist/thumbnails/users/users_tpl.png';

    vm.auth = Authentication;
    vm.t = dpPortraitTool;
    vm.p = p;
    vm.activate = activate;
    vm.reset = reset;
    vm.load = load;
    vm.clear = clear;
    vm.save = save;
    vm.addExistingPortrait = addExistingPortrait;

    activate();

    ////////////////

    function activate() {
      if (!vm.auth.user || $stateParams.userId !== vm.auth.user._id) {
        $state.go('userForm.signin');
      }
      $scope.$on('projectReady', function() {
        vm.reset(true);
        vm.load();
        vm.t.init();
      });
    }

    function reset(hideTemplate) {
      p.project.activeLayer.removeChildren();
      vm.background = p.project.activeLayer.dpGetBackground(p.project.view.bounds);
      vm.background.strokeColor = 'black';
      vm.template = new p.Raster({
        source   : imgSrc,
        position : p.view.center
      });
      vm.template.visible = !hideTemplate;
      vm.template.bringToFront();
      vm.drawing = new p.Group();
      vm.drawing.name = 'drawing';
      vm.drawing.bringToFront();
      vm.t.initCursor();
    }

    function load() {
      var img = new Image();
      img.src = imgSrc;
      if (img.complete) {
        vm.addExistingPortrait(img.src);
      } else {
        img.onload = _.partial(vm.addExistingPortrait, img.src);
        img.onerror = function() {
          vm.template.visible = true;
          p.view.draw();
        };
      }
    }

    function clear() {
      vm.drawing.removeChildren();
      vm.template.remove();
      p.view.draw();
    }

    function addExistingPortrait(src) {
      var portrait = new p.Raster({
        source   : src,
        position : p.view.center
      });
      vm.drawing.addChild(portrait);
      portrait.sendToBack();
    }

    function save() {
      var dataUrl = p.project.activeLayer.dpGetDataURL(p.view.bounds);
      vm.auth.user.post('portrait', {portrait : _.stripBase64(dataUrl)}).then(function(res) {
        Authentication.user.thumbVersion = res.version;
        dpToast.success('You\'re looking good! Your new portrait was successfully saved');
        $state.go('viewUser', {userId : $stateParams.userId});
        $analytics.eventTrack('user-portrait', {
          category : vm.auth.user._id
        });
      });
    }

  }
})();


