'use strict';

angular.module('labsome.users', []);

angular.module('labsome.users').factory('users', function($rootScope, $http) {
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
        return $http.get('/api/auth/v1/users').then(function(res) {
            self.all = res.data.objects;
            for (var i = 0; i < self.all.length; ++i) {
                var user = self.all[i];
                annotate_user(user);
                self.byUserId[user.id] = user;
            }
            self.ready = true;
            $rootScope.$broadcast('labsome.users.inventory_changed');
        });
    };

    self.new_api_token = function(user_id) {
        $http.post('/api/auth/v1/users/' + user_id + '/api-token').then(refresh);
    };

    $rootScope.$on('labsome.notify.new_socket_available', function(event, socket) {
        socket.on('object_changed:user', refresh);
        socket.on('object_deleted:user', refresh);
        refresh();
    });

    return self;
});

angular.module('labsome.users').directive('userAvatar', function(users) {
    var link = function(scope, elem, attrs) {
        scope.users = users;
    };

    return {
        restrict: 'AE',
        template: '<img class="img-circle profile-picture" ng-src="{{ users.byUserId[id].avatar_32 }}" style="width: {{ size }}; height: {{ size }};">',
        link: link,
        scope: {
            'id': '=',
            'size': '@'
        }
    };
});

angular.module('labsome.users').directive('userDisplayName', function(users) {
    var link = function(scope, elem, attrs) {
        scope.users = users;
    };

    return {
        restrict: 'AE',
        template: '{{ users.byUserId[id].display_name }} ',
        link: link,
        scope: {
            'id': '='
        }
    };
});

angular.module('labsome.users').directive('userEmail', function(users) {
    var link = function(scope, elem, attrs) {
        scope.users = users;
    };

    return {
        restrict: 'AE',
        template: '{{ users.byUserId[id].email }} ',
        link: link,
        scope: {
            'id': '='
        }
    };
});

angular.module('labsome.users').run(function($rootScope, users) {
    $rootScope.users = users;
});
