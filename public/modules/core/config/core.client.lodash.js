(function() {
  'use strict';

  angular
    .module('core')
    .run(run);

  run.$inject = ['$rootScope'];

  /* @ngInject */
  function run($rootScope) {
    var _ = $rootScope,
      methods = {};

    methods.chunk = function(array, n) {
      return _.transform(array, function(result, el, i, arr) {
        return i % n === 0 ? result.push(arr.slice(i, i + n)) : null;
      });
    };

    methods.stripBase64 = function(str) {
      return str.replace(/^data:image\/png;base64,/, '');
    };

    //methods.recursive = function(obj, opt, iterator) {
    //  function recurse(obj, property) {
    //    iterator(obj, property);
    //    _.each(_.keys(obj), function(prop) {
    //      recurse(obj[prop]);
    //    });
    //    //_.each(obj[opt], recurse);
    //  }
    //  recurse(obj);
    //};

    _.each(methods, function(method, methodName) {
      _[methodName] = _.bind(method, _);
    });
  }

})();
