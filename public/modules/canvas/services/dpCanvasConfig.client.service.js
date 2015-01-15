(function() {
  'use strict';

  angular
    .module('canvas')
    .factory('dpCanvasConfig', dpCanvasConfig);

  dpCanvasConfig.$inject = [];

  /* @ngInject */
  function dpCanvasConfig() {
    return {
      mode         : {
        SELECT : 1,
        JOIN   : 2
      },
      handleState  : {
        SELECTED : 1,
        BLUR     : 2,
        JOIN     : 3,
        HIDE     : 4
      },
      handleColor  : {
        1 : ['#FFC107', '#E91E63'],
        2 : ['#00E676', '#4CAF50'],
        3 : ['#82B1FF', '#2196F3']
      },
      handleRadius : 7,
      fonts        : [
        'Arial',
        'Verdana',
        'Times New Roman',
        'Courier New',
        'serif',
        'sans-serif',
        'monospace'
      ],
      fontWeights  : [
        'normal',
        'bold',
        'lighter'
      ]
    };

    ////////////////
  }
})();
