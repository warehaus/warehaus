'use strict';

angular.module('warehaus.users', []);

angular.module('warehaus.users').factory('users', function($rootScope, $http, $q, $log) {
    var ready_promise = $q.defer();

    var self = {
        ready: false,
        whenReady: ready_promise.promise,
        count: 0,
        byUserId: {}
    };

    var update_user_count = function() {
        self.count = Object.keys(self.byUserId).length;
    };

    var annotate_user = function(user) {
        user.display_name = user.display_name;
        user.email = user.email || '';
        var avatar_base_url = 'https://gravatar.com/avatar/' + md5(user.email) + '?d=mm';
        user.avatar_32 = avatar_base_url + '&s=70';
        user.avatar_96 = avatar_base_url + '&s=192';
    };

    var refresh = function() {
        return $http.get('/api/auth/users').then(function(res) {
            for (var i = 0; i < res.data.objects.length; ++i) {
                var user = res.data.objects[i];
                annotate_user(user);
                self.byUserId[user.id] = user;
            }
            update_user_count();
            self.ready = true;
            ready_promise.resolve();
            $rootScope.$broadcast('warehaus.users.inventory_changed');
        });
    };

    self.update_user = function(user_id, update) {
        return $http.put('/api/auth/users/' + user_id, update);
    };

    var user_changed = function(notification) {
        $log.debug('Fetching changed user:', notification.id);
        return $http.get('/api/auth/users/' + notification.id).then(function(res) {
            var user = res.data;
            annotate_user(user);
            self.byUserId[user.id] = user;
            update_user_count();
            $rootScope.$broadcast('warehaus.users.user_changed', notification.id);
        });
    };

    var user_deleted = function(notification) {
        $log.debug('Discarding deleted user:', notification.id);
        delete self.byUserId[notification.id];
        update_user_count();
        $rootScope.$broadcast('warehaus.users.user_deleted', notification.id);
    };

    $rootScope.$on('warehaus.models.new_socket_available', function(event, socket) {
        socket.on('object_changed:user', user_changed);
        socket.on('object_deleted:user', user_deleted);
        refresh();
    });

    return self;
});

angular.module('warehaus.users').directive('userAvatar', function(users) {
    var link = function(scope, elem, attrs) {
        scope.users = users;
    };

    return {
        restrict: 'AE',
        template: '<img class="img-circle profile-picture" ng-src="{{ users.byUserId[id].avatar_32 }}" ng-style="{width: size, height: size}">',
        link: link,
        scope: {
            'id': '=',
            'size': '@'
        }
    };
});

angular.module('warehaus.users').directive('userUsername', function(users) {
    var link = function(scope, elem, attrs) {
        scope.users = users;
    };

    return {
        restrict: 'AE',
        template: '{{ users.byUserId[id].username }} ',
        link: link,
        scope: {
            'id': '='
        }
    };
});

angular.module('warehaus.users').directive('userDisplayName', function(users) {
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

angular.module('warehaus.users').directive('userEmail', function(users) {
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

angular.module('warehaus.users').run(function($rootScope, users) {
    $rootScope.users = users;
});
