(function() {
  'use strict';

  angular
    .module('core')
    .controller('ContactController', ContactController);

  ContactController.$inject = [
    '$scope', 'Authentication', 'Restangular', 'dpBrowseHistory', 'dpToast', 'UsersConfig', '$analytics'
  ];

  /* @ngInject */
  function ContactController($scope, Authentication, Restangular, dpBrowseHistory, dpToast, UsersConfig, $analytics) {
    /* jshint validthis: true */
    var vm = this;

    vm.sendContactMsg = sendContactMsg;
    vm.contactConfig = UsersConfig.contact;
    vm.contact = {};
    vm.activate = activate;


    activate();

    ////////////////

    function activate() {
      $scope.$parent.title = 'Contact Us';
      vm.contact.email = Authentication.user ? Authentication.user.email : '';
    }

    function sendContactMsg() {
      Restangular.all('contact').post(vm.contact).then(function() {
        dpToast.success('Thank you for leaving a message! We\'ll take a look ASAP');
        dpBrowseHistory.back();
        $analytics.eventTrack('contact', {
          category : vm.contact.email,
          label    : vm.contact.subject
        });
      });
    }

  }
})();
