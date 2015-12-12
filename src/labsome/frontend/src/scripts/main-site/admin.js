'use strict';

angular.module('labsome.site.admin', []);

angular.module('labsome.site.admin').config(function($stateProvider, $urlRouterProvider, viewPath) {
    var admin = {
        url: '/admin',
        title: 'Admin',
        templateUrl: viewPath('main-site/views/admin/index.html'),
        controller: 'AdminController'
    };

    var admin_labs = {
        parent: admin,
        url: '/labs',
        title: 'Labs',
        templateUrl: viewPath('main-site/views/admin/labs.html')
    };

    var _update = function(options) {
        return ['$uibModal', '$state', '$stateParams', 'curUser', 'allLabs', function($uibModal, $state, $stateParams, curUser, allLabs) {
            if (!curUser.is_admin) {
                $state.go('admin');
                return;
            }
            $uibModal.open({
                templateUrl: viewPath(options.templateUrl),
                controller: options.controller,
                size: options.size,
                resolve: {
                    lab_id: function() {
                        return $stateParams.id;
                    }
                }
            }).result.then(function(result) {
                return allLabs.update($stateParams.id, result);
            }).finally(function() {
                $state.go('^');
            });
        }];
    };

    var admin_labs_rename = {
        parent: admin_labs,
        url: '/rename/:id',
        title: 'Rename',
        onEnter: _update({
            templateUrl: 'main-site/views/admin/rename-lab.html',
            controller: 'LabModal'
        })
    };

    var admin_labs_add_servers = {
        parent: admin_labs,
        url: '/add-servers/:id',
        title: 'Add Servers',
        onEnter: _update({
            templateUrl: 'main-site/views/admin/add-servers.html',
            controller: 'AddServersController',
            size: 'lg'
        })
    };

    var admin_labs_delete = {
        parent: admin_labs,
        url: '/delete/:id',
        title: 'Delete',
        onEnter: ['$uibModal', '$state', '$stateParams', 'curUser', 'allLabs', function($uibModal, $state, $stateParams, curUser, allLabs) {
            if (!curUser.is_admin) {
                $state.go('admin');
                return;
            }
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

    var admin_auth_users = {
        parent: admin,
        url: '/users?id',
        title: 'Users',
        templateUrl: viewPath('main-site/views/admin/users.html'),
        controller: 'UsersAdminController',
    };

    var admin_auth_ldap = {
        parent: admin,
        url: '/ldap',
        title: 'LDAP',
        templateUrl: viewPath('main-site/views/admin/ldap.html'),
        controller: 'LDAPSettingsController'
    };

    $urlRouterProvider.when(admin.url, admin.url + admin_labs.url);

    $stateProvider.state('admin', admin);
    $stateProvider.state('admin.labs', admin_labs);
    $stateProvider.state('admin.labs.add-servers', admin_labs_add_servers);
    $stateProvider.state('admin.labs.rename', admin_labs_rename);
    $stateProvider.state('admin.labs.delete', admin_labs_delete);
    $stateProvider.state('admin.create-lab', admin_create_lab);
    $stateProvider.state('admin.auth-users', admin_auth_users);
    $stateProvider.state('admin.auth-ldap', admin_auth_ldap);
});

angular.module('labsome.site.admin').controller('AdminController', function($scope, $location, curUser) {
    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        if (toState.parent && !curUser.is_admin) {
            $location.url('/admin');
        }
    });
});

angular.module('labsome.site.admin').controller('LabModal', function($scope, $uibModalInstance, lab_id) {
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

angular.module('labsome.site.admin').controller('AddServersController', function($scope, $state, $location, $uibModalInstance, lab_id) {
    $scope.lab_id = lab_id;

    var base_url = $location.protocol() + '://' + $location.host();
    if ((($location.protocol() == 'http') && ($location.port() != 80)) ||
        (($location.protocol() == 'https') && ($location.port() != 443))) {
        base_url += ':' + $location.port();
    }

    $scope.agent_url = base_url + '/api/hardware/v1/builtin/server/code/agent.py?lab_id=' + $scope.lab_id;

    $scope.close = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

angular.module('labsome.site.admin').controller('UsersAdminController', function($scope, $stateParams) {
    $scope.selected_user_id = $stateParams.id;
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
