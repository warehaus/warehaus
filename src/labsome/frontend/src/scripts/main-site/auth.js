'use strict';

angular.module('labsome.auth', []);

angular.module('labsome.auth').factory('users', function($rootScope, $http) {
    var self = {
        ready: false,
        all: [],
        byUserId: {}
    };

    var annotate_user = function(user) {
        user.display_name = user.first_name + ' ' + user.last_name;
        user.email = user.email || '';
        var avatar_base_url = 'https://gravatar.com/avatar/' + md5(user.email) + '?d=mm';
        user.avatar_32 = avatar_base_url + '&s=70';
        user.avatar_96 = avatar_base_url + '&s=192';
    };

    var refresh = function() {
        $http.get('/api/auth/v1/users').then(function(res) {
            self.all = res.data.objects;
            for (var i = 0; i < self.all.length; ++i) {
                var user = self.all[i];
                annotate_user(user);
                self.byUserId[user.id] = user;
            }
            self.ready = true;
            $rootScope.$broadcast('labsome.users_inventory_changed');
        });
    };

    refresh();

    return self;
});

angular.module('labsome.auth').factory('curUser', function($rootScope, $http, users) {
    var self = {
        is_admin: undefined
    };

    var refresh = function() {
        $http.get('/api/auth/v1/self').then(function(res) {
            for (var attr in res.data) {
                self[attr] = res.data[attr];
            }
            if (users.ready) {
                var more_attrs = users.byUserId[self.id];
                for (var attr in more_attrs) {
                    self[attr] = more_attrs[attr];
                }
            }
            self.is_admin = self.roles.indexOf('admin') != -1;
        });
    };

    refresh();

    $rootScope.$on('labsome.users_inventory_changed', refresh);

    return self;
});

angular.module('labsome.auth').run(function($rootScope, users, curUser) {
    $rootScope.users = users;
    $rootScope.curUser = curUser;
});
