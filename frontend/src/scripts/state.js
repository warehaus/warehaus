'use strict';

angular.module('warehaus.state', []);

angular.module('warehaus.state').factory('warehausState', function($rootScope, $http, $timeout, $state) {
    var self = {};

    var update_state = function(loaded, is_authenticated) {
        self.was_loaded = self.loaded;
        self.loaded = loaded;
        self.is_authenticated = is_authenticated;
        $rootScope.$broadcast('warehaus.state.update', self);
    };

    var auth_callback = function(res) {
        switch (res.status) {
        case 200:
            update_state(true, true);
            if (self.was_loaded) {
                $state.go('home');
            }
            break;
        case 401:
            update_state(true, false);
            if (!$state.current.preventAutomaticLogin) {
                $state.go('auth.login');
            }
            break;
        default:
            update_state(false, false);
            $timeout(self.refresh, 1000);
            break;
        }
    };

    self.refresh = function() {
        return $http.get('/api/auth/self').then(auth_callback, auth_callback);
    };

    self.refresh();

    return self;
});

angular.module('warehaus.state').service('siteUrl', function($location) {
    return function(path) {
        var base_url = $location.protocol() + '://' + $location.host();
        if ((($location.protocol() === 'http') && ($location.port() !== 80)) ||
            (($location.protocol() === 'https') && ($location.port() !== 443))) {
            base_url += ':' + $location.port();
        }
        return base_url + path;
    };
});

angular.module('warehaus.state').run(function($rootScope, warehausState) {
    $rootScope.warehausState = warehausState;
});
