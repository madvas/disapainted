(function() {
  'use strict';

  angular
    .module('core')
    .factory('dpBrowseHistory', dpBrowseHistory);

  dpBrowseHistory.$inject = ['$state', '$rootScope'];

  /* @ngInject */
  function dpBrowseHistory($state, $rootScope) {
    var history = []
      , me = {
        init : init,
        back : back
      };

    return me;

    ////////////////

    function init() {
      history = [];
      $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
        if (!fromState.name || !!~fromState.name.indexOf('userForm.')) return;
        history.push({
          state  : fromState,
          params : fromParams
        });
      });
    }

    function back() {
      var state = history.pop();
      if (!state) {
        $state.go('home');
      } else {
        $state.go(state.state, state.params);
      }
    }
  }
})();
