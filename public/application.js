'use strict';

//Start by defining the main module and adding the module dependencies
angular.module(AppConfig.appModuleName, AppConfig.appModuleVendorDependencies);

//Then define the init function for starting up the application
angular.element(document).ready(function() {
	//Fixing facebook bug with redirect
	if (window.location.hash === '#_=_') window.location.hash = '#!';
	angular.bootstrap(document, [AppConfig.appModuleName]);
});
