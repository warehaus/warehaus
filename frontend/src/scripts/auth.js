'use strict';

angular.module('labsome.auth', [
    'labsome.users',
    'angular-jwt'
]);

angular.module('labsome.auth').factory('curUser', function($rootScope, $http, labsomeState, users) {
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
        self.is_admin = self.roles.indexOf('admin') != -1;
        self.is_authenticated = true;
        $rootScope.$broadcast('labsome.auth.user_authorized');
    };

    var unload_current_user = function() {
        self.is_authenticated = false;
        $rootScope.$broadcast('labsome.auth.user_unauthorized');
    };

    self.logout = function() {
        localStorage.removeItem('id_token');
        labsomeState.refresh();
    };

    var load_current_user = function() {
        $http.get('/api/auth/v1/self').then(function(res) {
            update(res.data);
        });
    };

    $rootScope.$on('labsome.state.update', function(event, state) {
        if (!state.is_initialized) {
            return;
        }
        if (state.is_authenticated) {
            load_current_user();
        } else {
            unload_current_user();
        }
    });

    $rootScope.$on('labsome.users.inventory_changed', update_user_fields);

    return self;
});

angular.module('labsome.auth').controller('LoginController', function($scope, $http, labsomeState) {
    $scope.input = {};
    $scope.error = undefined;

    $scope.login = function() {
        $scope.working = true;
        $http.post('/api/auth/v1/login', $scope.input).then(function(res) {
            $scope.error = undefined;
            localStorage.setItem('id_token', res.data.access_token);
            labsomeState.refresh();
        }, function(res) {
            $scope.working = false;
            $scope.error = res.data.error;
        });
    };
});

angular.module('labsome.auth').config(function($httpProvider, jwtInterceptorProvider) {
    jwtInterceptorProvider.authPrefix = 'JWT ';
    jwtInterceptorProvider.tokenGetter = function() {
        return localStorage.getItem('id_token');
    };

    $httpProvider.interceptors.push('jwtInterceptor');
});

angular.module('labsome.auth').run(function($rootScope, curUser) {
    $rootScope.curUser = curUser;
});
