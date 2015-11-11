'use strict';

angular.module('labsome.views.dashboard', []);

angular.module('labsome.views.dashboard').config(['$stateProvider', 'viewPath', function($stateProvider, viewPath) {
    $stateProvider.state('dashboard', {
        url: '/dashboard',
        title: 'Dashboard',
        templateUrl: viewPath('dashboard.html')
    })
}]);

angular.module('labsome.views.dashboard').controller('DashboardController', ['$scope', function($scope) {
}]);
