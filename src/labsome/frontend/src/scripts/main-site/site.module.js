'use strict';

angular.module('labsome.site', [
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
