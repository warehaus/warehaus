'use strict';

angular.module('labsome.site.admin', []);

angular.module('labsome.site.admin').config(function($stateProvider, $urlRouterProvider, viewPath) {
    var admin = {
        url: '/admin',
        title: 'Admin',
        templateUrl: viewPath('main-site/views/admin/index.html')
    };

    var admin_ldap = {
        url: '/ldap',
        title: 'LDAP',
        templateUrl: viewPath('main-site/views/admin/ldap.html')
    };

    $urlRouterProvider.when(admin.url, admin.url + admin_ldap.url);

    $stateProvider.state('admin', admin);
    $stateProvider.state('admin.ldap', admin_ldap);
});

angular.module('labsome.site.admin').controller('LDAPSettingsController', function($scope, $http) {
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
