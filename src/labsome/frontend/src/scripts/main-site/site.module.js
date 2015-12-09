'use strict';

angular.module('labsome.site', [
    'btford.socket-io',
    'labsome.common',
    'labsome.auth',
    'labsome.site.labs',
    'labsome.site.account',
    'labsome.site.admin',
    'labsome.site.hardware'
]);

angular.module('labsome.site').config(function($stateProvider, $locationProvider, $urlRouterProvider) {
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/labs');
});

angular.module('labsome.site').factory('socketIo', function(socketFactory) {
    return socketFactory();
});
