'use strict';

angular.module('warehaus.users', []);

angular.module('warehaus.users').factory('users', function($rootScope, $http, $q, $log, getObjectNotifications) {
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

    var load_all_users = function() {
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

    getObjectNotifications('user', load_all_users, user_changed, user_deleted);

    return self;
});

angular.module('warehaus.users').service('simpleUserDirective', function(users) {
    var link = function(scope, elem, attrs) {
        scope.users = users;
    };

    return function(options) {
        return {
            restrict: 'AE',
            template: options.template,
            link: link,
            scope: options.scope
        };
    };
});

angular.module('warehaus.users').directive('userAvatar', function(simpleUserDirective) {
    return simpleUserDirective({
        template: '<img class="img-circle profile-picture" ng-src="{{ users.byUserId[id].avatar_32 }}" ng-style="{width: size, height: size}">',
        scope: {
            'id': '=',
            'size': '@'
        }
    });
});

angular.module('warehaus.users').directive('userUsername', function(simpleUserDirective) {
    return simpleUserDirective({
        template: '{{ users.byUserId[id].username }} ',
        scope: {
            'id': '='
        }
    });
});

angular.module('warehaus.users').directive('userDisplayName', function(simpleUserDirective) {
    return simpleUserDirective({
        template: '{{ users.byUserId[id].display_name }} ',
        scope: {
            'id': '='
        }
    });
});

angular.module('warehaus.users').directive('userEmail', function(simpleUserDirective) {
    return simpleUserDirective({
        template: '{{ users.byUserId[id].email }} ',
        scope: {
            'id': '='
        }
    });
});

angular.module('warehaus.users').directive('userMention', function(simpleUserDirective) {
    return simpleUserDirective({
        template: '<span ng-if="users.byUserId[id]">@{{ users.byUserId[id].username }}</span> ',
        scope: {
            'id': '='
        }
    });
});

angular.module('warehaus.users').directive('userLink', function(simpleUserDirective) {
    return simpleUserDirective({
        template: '<a class="link" ng-if="users.byUserId[id]">@{{ users.byUserId[id].username }}</a> ',
        scope: {
            'id': '='
        }
    });
});

angular.module('warehaus.users').run(function($rootScope, users) {
    $rootScope.users = users;
});
