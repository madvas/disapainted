(function() {
  'use strict';

  angular
    .module('animations')
    .controller('ListAnimationsController', ListAnimationsController);

  ListAnimationsController.$inject = [
    '$scope', '$localStorage', 'AnimsConfig', 'Restangular', 'dpResource', '$anchorScroll', '$location', '$analytics',
    'Authentication'
  ];

  /* @ngInject */
  function ListAnimationsController($scope, $localStorage, AnimsConfig, Restangular, dpResource, $anchorScroll,
                                    $location, $analytics, Authentication) {
    /* jshint validthis: true */
    var vm = this
      , unwatchFuncs = []
      , _ = $scope;

    vm.sortOptions = [
      {
        name  : 'Most Awesome Animations',
        value : 'likes/0'
      },
      {
        name  : 'Awesome Animations last day',
        value : 'likes/1'
      },
      {
        name  : 'Awesome Animations last week',
        value : 'likes/7'
      },
      {
        name  : 'Awesome Animations last month',
        value : 'likes/30'
      },
      {
        name  : 'Recent Animations',
        value : 'recent'
      },
      {
        name  : 'Random Animations',
        value : 'random'
      },
      {
        name  : 'More from ...',
        value : 'user/'
      }
    ];

    vm.totalItems = 0;
    vm.listPageSize = AnimsConfig.listPageSize;

    vm.listStorage = $localStorage.$default({
      list : {
        sort : vm.sortOptions[0].value,
        page : 1
      }
    }).list;

    vm.activate = activate;
    vm.getList = getList;
    vm.changeList = changeList;
    vm.isAdminLogged = isAdminLogged;
    vm.removeAnim = removeAnim;
    activate();

    ////////////////

    function activate() {
      unwatchFuncs.push($scope.$watch('current.creator', function(user) {
        if (_.isEmpty(user)) return;
        vm.sortOptions[6].value = 'user/' + user._id;
        vm.sortOptions[6].name = 'More from ' + user._id;
        if (!!~vm.listStorage.sort.indexOf('user')) {
          vm.listStorage.sort = vm.sortOptions[6].value;
          getList();
        }
      }));
      $scope.$on('$destroy', destroy);

      if (!~vm.listStorage.sort.indexOf('user')) {
        getList();
      } else {
        vm.listStorage.sort = 'user/';
      }
    }

    function getList() {
      vm.loading = true;
      vm.anims = [];
      Restangular.all('list/anims/' + vm.listStorage.sort)
        .getList({page : vm.listStorage.page, limit : AnimsConfig.listPageSize}).then(function(anims) {
          vm.loading = false;
          vm.anims = anims;
          dpResource.set(anims);
          vm.pageCount = anims.meta.pageCount;
          vm.totalCount = anims.meta.totalCount;
          $analytics.eventTrack('listAnims', {
            category : vm.listStorage.sort,
            label    : vm.listStorage.page
          });
        });
    }

    function changeList() {
      if (!vm.listStorage.page || vm.listStorage.page < 1 || vm.listStorage.page > vm.pageCount) return;
      $location.hash('top-list');
      $anchorScroll();
      getList();
    }

    function destroy() {
      _.invoke(unwatchFuncs, 'call');
    }

    function isAdminLogged() {
      return _.contains(Authentication.user.roles, 'admin');
    }

    function removeAnim(anim) {
      Restangular.restangularizeElement(null, anim, 'anims').remove().then(function() {
        _.remove(vm.anims, anim);
      });
    }

  }
})();
