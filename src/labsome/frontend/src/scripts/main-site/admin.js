'use strict';

angular.module('labsome.site.admin', []);

angular.module('labsome.site.admin').config(function($stateProvider, $urlRouterProvider, viewPath) {
    var admin = {
        url: '/admin',
        title: 'Admin',
        templateUrl: viewPath('main-site/views/admin/index.html')
    };

    var admin_labs = {
        parent: admin,
        url: '/labs',
        title: 'Labs',
        templateUrl: viewPath('main-site/views/admin/labs.html')
    };

    var admin_labs_rename = {
        parent: admin_labs,
        url: '/rename/:id',
        title: 'Rename',
        onEnter: ['$uibModal', '$state', '$stateParams', 'allLabs', function($uibModal, $state, $stateParams, allLabs) {
            $uibModal.open({
                templateUrl: viewPath('main-site/views/admin/rename-lab.html'),
                controller: 'LabModal',
                resolve: {
                    lab_id: function() {
                        return $stateParams.id;
                    }
                }
            }).result.then(function(result) {
                return allLabs.rename($stateParams.id, result.new_name);
            }).finally(function() {
                $state.go('^');
            });
        }]
    };

    var admin_labs_delete = {
        parent: admin_labs,
        url: '/delete/:id',
        title: 'Delete',
        onEnter: ['$uibModal', '$state', '$stateParams', 'allLabs', function($uibModal, $state, $stateParams, allLabs) {
            $uibModal.open({
                templateUrl: viewPath('main-site/views/admin/delete-lab.html'),
                controller: 'LabModal',
                resolve: {
                    lab_id: function() {
                        return $stateParams.id;
                    }
                }
            }).result.then(function() {
                return allLabs.delete($stateParams.id);
            }).finally(function() {
                $state.go('^');
            });
        }]
    };

    var admin_create_lab = {
        parent: admin,
        url: '/create-lab',
        title: 'Create Lab',
        templateUrl: viewPath('main-site/views/admin/create-lab.html'),
        controller: 'CreateLabController'
    };

    var admin_auth_ldap = {
        parent: admin,
        url: '/ldap',
        title: 'LDAP',
        templateUrl: viewPath('main-site/views/admin/ldap.html'),
        controller: 'LDAPSettingsController'
    };

    $urlRouterProvider.when(admin.url, admin.url + admin_create_lab.url);

    $stateProvider.state('admin', admin);
    $stateProvider.state('admin.labs', admin_labs);
    $stateProvider.state('admin.labs.rename', admin_labs_rename);
    $stateProvider.state('admin.labs.delete', admin_labs_delete);
    $stateProvider.state('admin.create-lab', admin_create_lab);
    $stateProvider.state('admin.auth-ldap', admin_auth_ldap);
});

angular.module('labsome.site.admin').controller('LabModal', function($scope, $uibModalInstance, allLabs, lab_id) {
    $scope.allLabs = allLabs;
    $scope.lab_id = lab_id
    $scope.result = {};

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.ok = function() {
        $uibModalInstance.close($scope.result);
    };
});

angular.module('labsome.site.admin').controller('CreateLabController', function($scope, $state, allLabs) {
    $scope.lab = {};

    $scope.save = function() {
        $scope.working = true;
        allLabs.create($scope.lab).then(function(res) {
            $state.go('admin.labs');
        }, function(res) {
            $scope.working = false;
            if (angular.isDefined(res.data.message)) {
                $scope.error = res.data.message;
            } else {
                $scope.error = res.data;
            }
        });
    };
});

angular.module('labsome.site.admin').controller('LDAPSettingsController', function($scope, $http) {
    $scope.working = true;

    var _update_from_res = function(res) {
        $scope.working = false;
        $scope.settings = {
            ldap: res.data
        };
    };

    $http.get('/api/settings/v1/ldap').then(_update_from_res);

    $scope.save_settings = function() {
        $scope.working = true;
        $http.post('/api/settings/v1/ldap', $scope.settings.ldap).then(_update_from_res);
    };
});
