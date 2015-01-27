(function() {
  'use strict';

  /* global _: true */
  var sendJsError = _.throttle(function(analytics, exception, Authentication) {
    var user = Authentication.user ? Authentication.user._id : '';
    analytics.eventTrack('error-js', {
      category : exception.message,
      label    : user + '\n' + location.pathname + '\n' + navigator.userAgent + '\n' + exception.stack
    });
  }, 30000);

  angular
    .module('core')
    .config(locationConfig)
    .config(restangularConfig)
    .config(ngToastConfig)
    .config(mdThemeConfig)
    .config(exceptionConfig)
    .config(bootstrapConfig)
    .run(handleRouteChangeErr)
    .run(restangularRun)
    .run(initServices);

  locationConfig.$inject = ['$locationProvider'];

  /* @ngInject */
  function locationConfig($locationProvider) {
    $locationProvider.html5Mode(true);
  }

  restangularConfig.$inject = ['RestangularProvider'];

  /* @ngInject */
  function restangularConfig(RestangularProvider) {
    RestangularProvider
      .setBaseUrl('/api')
      .setRestangularFields({
        id : '_id'
      })
      .setResponseExtractor(function(res, op) {
        var newRes = res || {};
        if (op === 'getList' && !angular.isArray(res)) {
          newRes = res.list;
          newRes.meta = res.meta;
          angular.forEach(newRes, function(val, key) {
            newRes[key].origEl = angular.copy(val);
          });
        } else {
          newRes.origEl = angular.copy(res);
        }
        return newRes;
      });
  }

  ngToastConfig.$inject = ['ngToastProvider'];

  /* @ngInject */
  function ngToastConfig(ngToastProvider) {
    ngToastProvider.configure({
      verticalPosition   : 'top',
      horizontalPosition : 'right',
      maxNumber          : 3,
      timeout            : 5000
    });
  }

  mdThemeConfig.$inject = ['$mdThemingProvider'];

  /* @ngInject */
  function mdThemeConfig($mdThemingProvider) {
    $mdThemingProvider.theme('default')
      .primaryColor('green')
      .accentColor('amber')
      .warnColor('pink');
  }

  bootstrapConfig.$inject = ['$tooltipProvider'];

  /* @ngInject */
  function bootstrapConfig($tooltipProvider) {
    $tooltipProvider.options({
      appendToBody : true
    });
  }


  restangularRun.$inject = ['Restangular', 'dpToast', '$state', '$analytics'];

  /* @ngInject */
  function restangularRun(Restangular, dpToast, $state, $analytics) {
    Restangular
      .setErrorInterceptor(function(res) {
        switch (res.status) {
          case 403 :
            dpToast.danger('Sorry, you\'re to do it, please sign in with different account');
            $state.go('userForm.signin');
            break;
          case 401 :
            dpToast.danger('Please sign in first!');
            $state.go('userForm.signin');
            break;
          case 400 :
            dpToast.danger(res.data && res.data.message);
            break;
          default :
            dpToast.danger();
            break;
        }
        $analytics.eventTrack('error-response-' + res.status, {
          category : res.config.url,
          label    : res.data && res.data.message
        });
      });
  }

  exceptionConfig.$inject = ['$provide'];

  /* @ngInject */
  function exceptionConfig($provide) {
    $provide.decorator('$exceptionHandler', extendExceptionHandler);
  }

  extendExceptionHandler.$inject = ['$delegate', '$analytics', 'Authentication'];

  /* @ngInject */
  function extendExceptionHandler($delegate, $analytics, Authentication) {
    return function(exception, cause) {
      sendJsError($analytics, exception, Authentication);
      $delegate(exception, cause);
    };
  }

  handleRouteChangeErr.$inject = ['$rootScope', 'dpToast', '$state'];

  /* @ngInject */
  function handleRouteChangeErr($rootScope, dpToast, $state) {
    $rootScope.$on('$routeChangeError', function(event, current, previous, rejection) {
        var destination = (current && (current.title || current.name || current.loadedTemplateUrl)) ||
          'unknown target';
        var msg = 'Sorry, I couldn\'t get to ' + destination + '. ' + (rejection.msg || '');
        dpToast.danger(msg);
        $state.go('home');
      }
    );
  }

  initServices.$inject = ['$FB', 'dpBrowseHistory'];

  /* @ngInject */
  function initServices($FB, dpBrowseHistory) {
    $FB.init('150162395079841');
    dpBrowseHistory.init();
  }

})();

