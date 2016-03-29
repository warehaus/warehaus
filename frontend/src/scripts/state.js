'use strict';

angular.module('warehaus.state', []);

angular.module('warehaus.state').factory('warehausState', function($rootScope, $http, $timeout) {
    var self = {};

    var update_state = function(loaded, is_authenticated) {
        self.loaded = loaded;
        self.is_authenticated = is_authenticated;
        $rootScope.$broadcast('warehaus.state.update', self);
    };

    var auth_callback = function(res) {
        switch (res.status) {
        case 200:
            update_state(true, true);
            break;
        case 401:
            update_state(true, false);
            break;
        default:
            update_state(false, false);
            $timeout(self.refresh, 1000);
            break;
        }
    };

    self.refresh = function() {
        return $http.get('/api/v1/auth/self').then(auth_callback, auth_callback);
    };

    self.refresh();

    return self;
});

angular.module('warehaus.state').run(function($rootScope, warehausState) {
    $rootScope.warehausState = warehausState;
});
