(function() {
  'use strict';

  angular
    .module('animations')
    .run(run);

  run.$inject = ['dpResource'];

  /* @ngInject */
  function run(dpResource) {
    dpResource.clear();
  }

})();
