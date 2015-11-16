'use strict';

angular.module('labsome.login', [
    'labsome.common'
]);

angular.module('labsome.login').controller('LoginController', ['$scope', '$http', '$location', function($scope, $http, $location) {
    $scope.input = {};

    $scope.login = function() {
        $scope.working = true;
        $http.post('/api/v1/auth/login/local', $scope.input).then(function(response) {
            // Successful login
            $location.set('/');
        }, function(response) {
            // Login error
            $scope.working = false;
            $scope.error = response.data;
        });
    };
}]);
