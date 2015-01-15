(function() {
  'use strict';

  angular
    .module('core')
    .controller('HomeController', HomeController);

  HomeController.$inject = ['Restangular', 'dpResource'];

  /* @ngInject */
  function HomeController(Restangular, dpResource) {
    /* jshint validthis: true */
    var vm = this;

    vm.sections = {
      anims : {
        limit : 8,
        types : {
          likes  : {
            title : 'Most Liked Animations'
          },
          recent : {
            title : 'Recent Animations'
          },
          random : {
            title : 'Random Animations'
          }
        }
      },
      users : {
        limit : 6,
        types : {
          likes : {
            title : 'Best Animators'
          }
        }
      }
    };
    vm.getList = getList;
    vm.getPopoverPlacement = getPopoverPlacement;

    ////////////////

    function getList(section, type) {
      var sec = vm.sections[section];
      sec.types[type].list = Restangular.all('list/' + section + '/' + type)
        .getList({page : 1, limit : sec.limit}).then(function(list) {
          sec.types[type].list = list;
          dpResource.add(list, section);
        });
    }

    function getPopoverPlacement(key, items) {
      if (key < items.length / 2) return 'top';
      return 'bottom';
    }

  }
})();
