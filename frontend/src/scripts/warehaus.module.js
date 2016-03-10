'use strict';

angular.module('warehaus', [
    'warehaus.ui_helpers',
    'warehaus.templates',
    'warehaus.state',
    'warehaus.first_setup',
    'warehaus.models',
    'warehaus.users',
    'warehaus.auth',
    'warehaus.labs',
    'warehaus.account',
    'warehaus.admin'
]);

angular.module('warehaus').config(function($stateProvider, $locationProvider, $urlRouterProvider) {
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/labs');
});
