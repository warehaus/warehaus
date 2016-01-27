'use strict';

angular.module('labsome', [
    'labsome.ui_helpers',
    'labsome.templates',
    'labsome.state',
    'labsome.first_setup',
    'labsome.models',
    'labsome.users',
    'labsome.auth',
    'labsome.labs',
    'labsome.account',
    'labsome.admin'
]);

angular.module('labsome').config(function($stateProvider, $locationProvider, $urlRouterProvider) {
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/labs');
});
