'use strict';

angular.module('warehaus.auth', [
    'warehaus.users',
    'angular-jwt'
]);

angular.module('warehaus.auth').provider('authUrlRoutes', function(viewPath) {
    var auth_url_routes = {
        name: 'auth',
        url: '/auth',
        autoRedirectToChild: 'login',
        preventAutomaticLogin: true,
        views: {
            '': {
                template: '<ui-view/>'
            }
        },
        children: [
            {
                name: 'login',
                url: '/login',
                preventAutomaticLogin: true,
                templateUrl: viewPath('auth/login.html'),
                controller: 'LoginController'
            },
            {
                name: 'google-callback',
                url: '/google-callback?code',
                preventAutomaticLogin: true,
                templateUrl: viewPath('auth/google-login-callback.html'),
                controller: 'GoogleLoginCallbackController'
            }
        ]
    };

    return {
        $get: function() {
            return auth_url_routes;
        }
    };
});

angular.module('warehaus.admin').config(function(urlRegisterProvider, authUrlRoutesProvider) {
    urlRegisterProvider.$get()(authUrlRoutesProvider.$get());
});

angular.module('warehaus.auth').constant('authTokenVar', 'warehausAuthToken');

angular.module('warehaus.auth').service('authToken', function($log, authTokenVar, warehausState) {
    var self = {};

    self.set = function(new_token) {
        localStorage.setItem(authTokenVar, new_token);
        $log.info('Got new authentication token');
        warehausState.refresh();
    };

    self.discard = function() {
        localStorage.removeItem(authTokenVar);
        $log.info('Discarded authentication token');
        warehausState.refresh();
    };

    return self;
});

angular.module('warehaus.auth').config(function($httpProvider, jwtInterceptorProvider, authTokenVar) {
    jwtInterceptorProvider.authPrefix = 'JWT ';
    jwtInterceptorProvider.tokenGetter = function() {
        return localStorage.getItem(authTokenVar);
    };
    $httpProvider.interceptors.push('jwtInterceptor');
});

angular.module('warehaus.auth').factory('curUser', function($rootScope, $http, $state, $log, authToken, users) {
    var self = {
        is_admin: undefined,
        is_authenticated: false
    };

    var update_user_fields = function() {
        if (users.ready) {
            var more_attrs = users.byUserId[self.id];
            for (var attr in more_attrs) {
                self[attr] = more_attrs[attr];
            }
        }
    };

    var update = function(new_user) {
        for (var attr in new_user) {
            self[attr] = new_user[attr];
        }
        update_user_fields();
        self.is_admin = (self.role === 'admin');
        self.is_authenticated = true;
        $log.info('Authorized current user');
        $rootScope.$broadcast('warehaus.auth.user_authorized');
    };

    var unload_current_user = function() {
        self.is_authenticated = false;
        $log.info('Unauthorized current user');
        $rootScope.$broadcast('warehaus.auth.user_unauthorized');
    };

    self.logout = function() {
        authToken.discard();
        $state.go('auth.login');
    };

    var load_current_user = function() {
        $http.get('/api/auth/self').then(function(res) {
            update(res.data);
        });
    };

    $rootScope.$on('warehaus.state.update', function(event, state) {
        if (state.is_authenticated) {
            load_current_user();
        } else {
            unload_current_user();
        }
    });

    $rootScope.$on('warehaus.users.inventory_changed', update_user_fields);

    return self;
});

angular.module('warehaus.auth').controller('LoginController', function($scope, $http, $log, authToken) {
    $scope.input = {};
    $scope.error = undefined;
    $scope.working = false;

    $http.get('/api/auth/login').then(function(res) {
        $scope.login_methods = res.data;
    });

    $scope.$on('warehaus.state.update', function(new_state) {
        if (!new_state.is_authenticated) {
            $scope.working = false;
        }
    });

    $scope.login = function() {
        $scope.working = true;
        $scope.error = undefined;
        $http.post('/api/auth/login/local', $scope.input).then(function(res) {
            authToken.set(res.data.access_token);
        }, function(res) {
            $scope.working = false;
            $scope.error = res.data.message;
            $log.info('Could not log-in:', $scope.error);
        });
    };
});

angular.module('warehaus.auth').controller('GoogleLoginCallbackController', function($scope, $http, $stateParams, $log, authToken) {
    $http.get('/api/auth/login/google/callback', { params: { code: $stateParams.code } }).then(function(res) {
        authToken.set(res.data.access_token);
    }, function(res) {
        $scope.error = res.data.message || res.data;
        $log.error('Could not log-in:', $scope.error);
    });
});

angular.module('warehaus.auth').run(function($rootScope, curUser) {
    $rootScope.curUser = curUser;
});
