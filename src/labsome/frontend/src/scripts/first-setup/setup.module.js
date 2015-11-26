'use strict';

angular.module('labsome.first_setup', [
    'labsome.common'
]);

angular.module('labsome.first_setup').config(function($locationProvider) {
    $locationProvider.html5Mode(true);
});

angular.module('labsome.first_setup').controller('FirstSetupController', function($scope, $http, $uibModal, $timeout, viewPath) {
    $scope.settings = {
        ldap: {
            server_scheme: 'ldap://',
            server_address: null,
            server_port: null,
            users_dn: 'ou=users',
            attribute_username: 'cn',
            attribute_first_name: 'givenName',
            attribute_last_name: 'sn',
            attribute_email: 'mail'
        }
    };

    var _reset = function() {
        $scope.working = false;
        $scope.completed = false;
        $scope.error = undefined;
    };

    var _http_error = function(error) {
        _reset();
        $scope.error = error.data;
    };

    $scope.test_settings = function() {
        _reset();
        $scope.working = true;
        $http.post('/api/first-setup/test', $scope.settings).then(function(response) {
            $scope.working = false;
            var modalInstance = $uibModal.open({
                templateUrl: viewPath('first-setup/verification.html'),
                controller: 'VerifyFirstSetupConfigController',
                resolve: {
                    settings: function() {
                        return $scope.settings;
                    },
                    test_result: function() {
                        return response.data;
                    }
                }
            });
            modalInstance.result.then(function() {
                $scope.working = true;
                $http.post('/api/first-setup/configure', $scope.settings).then(function() {
                    $http.post('/api/first-setup/restart-server');
                    $timeout(function() {
                        window.location = '/';
                    }, 5000);
                }, _http_error);
            }, _reset);
        }, _http_error);
    };
});

angular.module('labsome.first_setup').controller('VerifyFirstSetupConfigController', function($scope, $uibModalInstance, $http, settings, test_result) {
    $scope.settings = settings;
    $scope.test_result = test_result;

    $scope.ok = function() {
        $uibModalInstance.close();
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});
