'use strict';

angular.module('labsome.site', [
    'labsome.common',
    'labsome.site.views'
]);

angular.module('labsome.site').config(['$stateProvider', '$locationProvider', '$urlRouterProvider', 'viewPath', function($stateProvider, $locationProvider, $urlRouterProvider, viewPath) {
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/dashboard');
}]);
