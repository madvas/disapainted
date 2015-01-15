'use strict';

var AppConfig = (function() {
  var appModuleName = 'disapainted'
    , appModuleVendorDependencies = [
      'ngAnimate',
      'ngMessages',
      'ui.router',
      'ui.bootstrap',
      'ui.utils',
      'restangular',
      'angular-lodash',
      'ngStorage',
      'ngMaterial',
      'djds4rce.angular-socialshare',
      'colorpicker.module',
      'ngToast',
      'yaru22.angular-timeago',
      'angulartics',
      'angulartics.google.analytics',
      'angularFileUpload'
    ];

  var registerModule = function(moduleName, dependencies) {
    angular.module(moduleName, dependencies || []);
    angular.module(appModuleName).requires.push(moduleName);
  };

  return {
    appModuleName               : appModuleName,
    appModuleVendorDependencies : appModuleVendorDependencies,
    registerModule              : registerModule
  };
})();
