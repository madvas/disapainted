(function() {
  'use strict';

  angular
    .module('animations')
    .factory('dpPaperScope', dpPaperScope);

  dpPaperScope.$inject = ['paper'];

  /* @ngInject */
  function dpPaperScope(paper) {
    var me = {}
      , paperScope = new paper.PaperScope();

    paperScope.install(me);
    me.paperScope = paperScope;
    return me;

    ////////////////

  }
})();
