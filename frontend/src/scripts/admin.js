'use strict';

angular.module('warehaus.admin', ['warehaus.ui_helpers']);

angular.module('warehaus.admin').provider('adminView', function(viewPath) {
    return {
        $get: function() {
            return function(uri) {
                return viewPath('admin/' + uri);
            };
        }
    };
});

angular.module('warehaus.admin').provider('adminUrlRoutes', function(adminViewProvider) {
    var adminView = adminViewProvider.$get();

    var admin_url_routes = {
        name: 'admin',
        url: '/admin',
        views: {
            '': {
                templateUrl: adminView('index.html'),
                controller: 'AdminController'
            },
            'top-navigation': {
                template: '<a ui-sref="labs"><i class="fa fa-angle-left"> </i> Back</a>'
            }
        },
        autoRedirectToChild: 'users',
        resolve: {
            $title: function() {
                return 'Admin';
            }
        },
        children: [
            {
                name: 'users',
                url: '/users?id',
                templateUrl: adminView('users.html'),
                controller: 'UsersAdminController',
                resolve: {
                    $title: function() {
                        return 'Users';
                    }
                }
            },
            {
                name: 'integrations',
                url: '/integrations',
                templateUrl: adminView('integrations.html'),
                controller: function() { },
                autoRedirectToChild: 'google-login',
                resolve: {
                    $title: function() {
                        return 'Integrations';
                    }
                },
                children: [
                    {
                        name: 'google-login',
                        url: '/google-login',
                        templateUrl: adminView('google-login.html'),
                        controller: 'GoogleLoginAdminController',
                        resolve: {
                            $title: function() {
                                return 'Google';
                            }
                        }
                    },
                    {
                        name: 'ldap-login',
                        url: '/ldap-login',
                        templateUrl: adminView('ldap-login.html'),
                        controller: 'LDAPLoginAdminController',
                        resolve: {
                            $title: function() {
                                return 'LDAP';
                            }
                        }
                    }
                ]
            }
        ]
    };

    return {
        $get: function() {
            return admin_url_routes;
        }
    };
});

angular.module('warehaus.admin').config(function(urlRegisterProvider, adminUrlRoutesProvider) {
    urlRegisterProvider.$get()(adminUrlRoutesProvider.$get());
});

angular.module('warehaus.admin').controller('AdminController', function($scope, $location, curUser) {
    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        if (toState.parent && !curUser.is_admin) {
            $location.url('/admin');
        }
    });
});

angular.module('warehaus.admin').controller('UsersAdminController', function($scope, $stateParams, createNewUser) {
    $scope.selected_user_id = $stateParams.id;
    $scope.createNewUser = createNewUser;
});

angular.module('warehaus.admin').controller('AuthenticationAdminController', function($scope) {
});

angular.module('warehaus.admin').service('createNewUser', function($uibModal, adminView) {
    return function() {
        $uibModal.open({
            templateUrl: adminView('create-user.html'),
            controller: 'CreateNewUserController'
        });
    };
});

angular.module('warehaus.admin').controller('CreateNewUserController', function($scope, $controller, $http, $uibModalInstance) {
    $controller('ModalBase', {$scope: $scope, $uibModalInstance: $uibModalInstance});
    $scope.user = {};

    $scope.do_work = function() {
        return $http.post('/api/auth/users', $scope.user);
    };
});

angular.module('warehaus.admin').controller('LocalAuthBackendController', function($scope, users, createNewUser) {
    $scope.users = users;
    $scope.createNewUser = createNewUser;
});

angular.module('warehaus.admin').controller('GoogleLoginAdminController', function($scope, $http, siteUrl) {
    var SETTINGS_URL = '/api/auth/login/google/settings';
    $scope.working = true;

    var update = function(res) {
        $scope.google_settings = res.data.google_settings;
        $scope.working = false;
    };

    var update_error = function(res) {
        $scope.working = false;
        $scope.error = res.data.message || res.data;
    };

    $http.get(SETTINGS_URL).then(update, update_error);

    $scope.detected_redirect_uri = siteUrl('/ui/auth/google-callback');

    $scope.save = function() {
        $scope.working = true;
        $scope.google_settings.redirect_uri = $scope.detected_redirect_uri;
        return $http.post(SETTINGS_URL, { google_settings: $scope.google_settings }).then(update, update_error);
    };
});

angular.module('warehaus.admin').controller('LDAPLoginAdminController', function($scope, $http) {
    $scope.working = true;

    var _update_from_res = function(res) {
        $scope.working = false;
        $scope.settings = {
            ldap: res.data
        };
    };

    //$http.get('/api/v1/settings/ldap').then(_update_from_res);

    $scope.save_settings = function() {
        $scope.working = true;
        $http.post('/api/v1/settings/ldap', $scope.settings.ldap).then(_update_from_res);
    };
});
