'use strict';

angular.module('warehaus.users', []);

angular.module('warehaus.users').factory('users', function($rootScope, $http) {
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
        return $http.get('/api/v1/auth/users').then(function(res) {
            self.all = res.data.objects;
            for (var i = 0; i < self.all.length; ++i) {
                var user = self.all[i];
                annotate_user(user);
                self.byUserId[user.id] = user;
            }
            self.ready = true;
            $rootScope.$broadcast('warehaus.users.inventory_changed');
        });
    };

    self.new_api_token = function(user_id) {
        $http.post('/api/v1/auth/users/' + user_id + '/api-tokens').then(refresh);
    };

    $rootScope.$on('warehaus.models.new_socket_available', function(event, socket) {
        socket.on('object_changed:user', refresh);
        socket.on('object_deleted:user', refresh);
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
        template: '<img class="img-circle profile-picture" ng-src="{{ users.byUserId[id].avatar_32 }}" style="width: {{ size }}; height: {{ size }};">',
        link: link,
        scope: {
            'id': '=',
            'size': '@'
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
