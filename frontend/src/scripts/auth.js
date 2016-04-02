'use strict';

angular.module('warehaus.auth', [
    'warehaus.users',
    'angular-jwt'
]);

angular.module('warehaus.auth').factory('curUser', function($rootScope, $http, $log, warehausState, users) {
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
        self.is_admin = (self.role == 'admin');
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
        localStorage.removeItem('id_token');
        warehausState.refresh();
    };

    var load_current_user = function() {
        $http.get('/api/v1/auth/self').then(function(res) {
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

angular.module('warehaus.auth').controller('LoginController', function($scope, $http, $log, warehausState) {
    $scope.input = {};
    $scope.error = undefined;
    $scope.working = false;

    $scope.$on('warehaus.state.update', function(new_state) {
        if (!new_state.is_authenticated) {
            $scope.working = false;
        }
    });

    $scope.login = function() {
        $scope.working = true;
        $scope.error = undefined;
        $http.post('/auth/login/local', $scope.input).then(function(res) {
            localStorage.setItem('id_token', res.data.access_token);
            $log.info('Successfully logged-in');
            warehausState.refresh();
        }, function(res) {
            $scope.working = false;
            $scope.error = res.data.message;
            $log.info('Could not log-in:', $scope.error);
        });
    };
});

angular.module('warehaus.auth').config(function($httpProvider, jwtInterceptorProvider) {
    jwtInterceptorProvider.authPrefix = 'JWT ';
    jwtInterceptorProvider.tokenGetter = function() {
        return localStorage.getItem('id_token');
    };

    $httpProvider.interceptors.push('jwtInterceptor');
});

angular.module('warehaus.auth').run(function($rootScope, curUser) {
    $rootScope.curUser = curUser;
});
