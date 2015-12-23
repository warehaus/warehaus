'use strict';

angular.module('labsome.admin', []);

angular.module('labsome.admin').config(function($stateProvider, $urlRouterProvider, viewPath) {
    var admin = {
        url: '/admin',
        templateUrl: viewPath('main-site/views/admin/index.html'),
        controller: 'AdminController',
        resolve: {
            $title: function() {
                return 'Admin';
            }
        }
    };

    var admin_auth_users = {
        parent: admin,
        url: '/users?id',
        templateUrl: viewPath('main-site/views/admin/users.html'),
        controller: 'UsersAdminController',
        resolve: {
            $title: function() {
                return 'Users';
            }
        }
    };

    var admin_auth_ldap = {
        parent: admin,
        url: '/ldap',
        templateUrl: viewPath('main-site/views/admin/ldap.html'),
        controller: 'LDAPSettingsController',
        resolve: {
            $title: function() {
                return 'LDAP';
            }
        }
    };

    $urlRouterProvider.when(admin.url, admin.url + admin_auth_users.url);

    $stateProvider.state('admin', admin);
    $stateProvider.state('admin.auth-users', admin_auth_users);
    $stateProvider.state('admin.auth-ldap', admin_auth_ldap);
});

angular.module('labsome.admin').controller('AdminController', function($scope, $location, curUser) {
    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        if (toState.parent && !curUser.is_admin) {
            $location.url('/admin');
        }
    });
});

angular.module('labsome.admin').controller('UsersAdminController', function($scope, $stateParams) {
    $scope.selected_user_id = $stateParams.id;
});

angular.module('labsome.admin').controller('LDAPSettingsController', function($scope, $http) {
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
