(function() {
  'use strict';

  angular
    .module('users')
    .controller('AnimsUserController', AnimsUserController);

  AnimsUserController.$inject = [
    '$scope', '$stateParams', 'Authentication', 'dpResource', '$localStorage', 'AnimsConfig',
    'Restangular', '$mdDialog', '$state', '$location', '$anchorScroll', '$analytics'
  ];

  /* @ngInject */
  function AnimsUserController($scope, $stateParams, Authentication, dpResource, $localStorage, AnimsConfig,
                               Restangular, $mdDialog, $state, $location, $anchorScroll, $analytics) {
    /* jshint validthis: true */
    var vm = this
      , _ = $scope
      , allSortOpts = [
        {
          name  : 'Most popular',
          value : '-likesCount'
        },
        {
          name  : 'Newest first',
          value : '-datePublish'
        }
      ];

    vm.activate = activate;
    vm.getList = getList;
    vm.publishedSwitchChange = publishedSwitchChange;
    vm.updateSortOpts = updateSortOpts;
    vm.initGetList = initGetList;
    vm.showMore = showMore;
    vm.removeAnim = removeAnim;
    vm.createAnim = createAnim;
    vm.auth = Authentication;
    vm.creator = Authentication.user && Authentication.user._id === $stateParams.userId;
    vm.sortOpts = _.clone(allSortOpts);
    vm.storage = $localStorage.$default({
      userAnims : {
        sort      : vm.sortOpts[0].value,
        published : false
      }
    }).userAnims;

    activate();

    ////////////////

    function activate() {
      $location.hash('top');
      $anchorScroll();
      vm.current = {
        user : dpResource.get($stateParams.userId, 'users').$object
      };
      vm.updateSortOpts();
      vm.initGetList();
    }

    function getList() {
      vm.loading = true;
      Restangular.all('list/anims/user/' + $stateParams.userId).getList({
        page     : vm.page,
        limit    : AnimsConfig.userAnimsPageSize,
        sort     : vm.storage.sort,
        editable : vm.storage.published ? 0 : 1
      }).then(function(anims) {
        vm.loading = false;
        vm.allLoaded = anims.length < AnimsConfig.userAnimsPageSize;
        vm.anims = vm.anims.concat(anims);
        vm.totalCount = anims.meta.totalCount;
        dpResource.set(vm.anims);
      });
    }

    function publishedSwitchChange() {
      vm.updateSortOpts();
      vm.initGetList();
    }

    function updateSortOpts() {
      if (!vm.creator) return;
      if (!vm.storage.published) {
        vm.storage.sort = vm.sortOpts[1].value;
        vm.sortOpts.shift();
      } else {
        vm.sortOpts = _.clone(allSortOpts);
      }
    }

    function initGetList() {
      vm.anims = [];
      vm.page = 1;
      vm.getList();
    }

    function showMore() {
      vm.page++;
      vm.getList();
    }


    function removeAnim(anim, evt) {
      $mdDialog.show({
        controller   : DeleteAnimController,
        controllerAs : 'vm',
        templateUrl  : 'modules/users/animations/delete-anim.client.view.html',
        targetEvent  : evt,
        hasBackdrop  : false
      }).then(function() {
        var index = _.findIndex(vm.anims, {_id : anim._id});
        vm.anims.splice(index, 1);
        vm.totalCount--;
        Restangular.restangularizeElement(null, anim, 'anims').remove().then(function() {
          $analytics.eventTrack('anim-delete', {
            category : vm.auth.user._id,
            label    : anim._id
          });
        }, function() {
          vm.anims.splice(index, 0, anim);
          vm.totalCount++;
        });
      });
    }


    function createAnim() {
      Restangular.all('anims').customPUT().then(function(anim) {
        $analytics.eventTrack('anim-create', {
          category : vm.auth.user._id,
          label    : anim._id
        });
        $state.go('canvas', {animId : anim._id});
      });
    }
  }


  DeleteAnimController.$inject = ['$mdDialog'];

  /* @ngInject */
  function DeleteAnimController($mdDialog) {
    /* jshint validthis: true */
    var vm = this;
    vm.mdDialog = $mdDialog;
  }


})();
