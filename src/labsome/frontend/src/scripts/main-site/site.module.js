'use strict';

angular.module('labsome.site', [
    'labsome.common',
    'labsome.auth',
    'labsome.site.labs',
    'labsome.site.admin'
]);

angular.module('labsome.site').config(function($stateProvider, $locationProvider, $urlRouterProvider) {
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/labs');
});
