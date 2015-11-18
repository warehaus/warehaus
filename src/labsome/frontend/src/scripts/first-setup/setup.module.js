'use strict';

angular.module('labsome.first_setup', [
    'labsome.common'
]);

angular.module('labsome.first_setup').config(['$locationProvider', function($locationProvider) {
    $locationProvider.html5Mode(true);
}]);

angular.module('labsome.first_setup').controller('FirstSetupController', ['$scope', '$http', '$timeout', function($scope, $http, $timeout) {
    $scope.settings = {
        ldap_username_property: 'cn'
    };
    $scope.working = false;
    $scope.complete = false;
    $scope.error = undefined;

    $scope.save_settings = function() {
        $scope.working = true;
        $http.post('/api/first-setup/configure', $scope.settings).then(function() {
            $scope.complete = true;
            $scope.error = undefined;
            $http.post('/api/first-setup/restart-server');
            $timeout(function() {
                window.location = '/';
            }, 4000);
        }, function(error) {
            $scope.complete = false;
            $scope.working = false;
            $scope.error = error.data;
        });
    };
}]);
