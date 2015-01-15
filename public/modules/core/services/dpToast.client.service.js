(function() {
  'use strict';

  angular
    .module('core')
    .factory('dpToast', dpToast);

  dpToast.$inject = ['ngToast', '$rootScope'];

  /* @ngInject */
  function dpToast(ngToast, $rootScope) {
    var me
      , _ = $rootScope
      , errMsgs = [
        'Oops! Something went horribly wrong!',
        'Oh no! I terribly failed!',
        'Sorry, something just broke in me :(',
        'Sorry, I must have bad day ...'
      ];

    me = {
      info    : info,
      success : success,
      warnign : warning,
      danger  : danger
    };

    return me;

    ////////////////

    function info(text, opts) {
      ngToast.create(_.extend({
        content : text,
        'class' : 'info'
      }, opts));
    }

    function success(text, opts) {
      ngToast.create(_.extend({
        content : text,
        'class' : 'success'
      }, opts));
    }

    function warning(text, opts) {
      ngToast.create(_.extend({
        content : text,
        'class' : 'warning'
      }, opts));
    }

    function danger(text, opts) {
      text = _.isString(text) ? text : '';
      ngToast.create(_.extend({
        content : text || errMsgs[_.random(errMsgs.length - 1)],
        'class' : 'danger'
      }, opts));
    }
  }
})();
