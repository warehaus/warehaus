'use strict';

angular.module('labsome.auth', [
    'labsome.users'
]);

angular.module('labsome.auth').factory('curUser', function($rootScope, $http, users) {
    var self = {
        is_ready: false,
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

    self.update = function(new_user) {
        for (var attr in new_user) {
            self[attr] = new_user[attr];
        }
        update_user_fields();
        self.is_admin = self.roles.indexOf('admin') != -1;
        self.is_authenticated = true;
        $rootScope.$broadcast('labsome.auth.user_authorized');
    };

    var _remove_user = function() {
        self.is_authenticated = false;
        $rootScope.$broadcast('labsome.auth.user_unauthorized');
    };

    self.logout = function() {
        $http.get('/api/auth/v1/logout').then(_remove_user);
    };

    var initial_load = function() {
        $http.get('/api/auth/v1/self').then(function(res) {
            self.update(res.data);
        }, _remove_user).finally(function() {
            self.is_ready = true;
        });
    };

    initial_load();

    $rootScope.$on('labsome.users.inventory_changed', update_user_fields);

    return self;
});

angular.module('labsome.auth').controller('LoginController', function($scope, $http, curUser) {
    $scope.input = {};
    $scope.error = undefined;

    $scope.login = function() {
        $scope.working = true;
        $http.post('/api/auth/v1/login', $scope.input).then(function(res) {
            $scope.error = undefined;
            curUser.update(res.data);
        }, function(res) {
            $scope.working = false;
            $scope.error = res.data.error;
        });
    };
});

angular.module('labsome.auth').run(function($rootScope, curUser) {
    $rootScope.curUser = curUser;
});
