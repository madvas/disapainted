(function() {
  'use strict';

  angular
    .module('core')
    .filter('words', words);

  words.$inject = [];

  /* @ngInject */
  function words() {
    return function(input, words) {
      if (isNaN(words)) return input;
      if (words <= 0) return '';
      if (input) {
        var inputWords = input.split(/\s+/);
        if (inputWords.length > words) {
          input = inputWords.slice(0, words).join(' ') + '...';
        }
      }
      return input;
    };
  }
})();
