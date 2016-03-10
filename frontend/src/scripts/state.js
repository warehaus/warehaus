'use strict';

angular.module('warehaus.state', []);

angular.module('warehaus.state').factory('warehausState', function($rootScope, $http, $timeout) {
    var self = {};

    self.refresh = function() {
        $http.get('/api/v1/state').then(function(res) {
            self.loaded = true;
            self.is_initialized = res.data.is_initialized;
            self.is_authenticated = res.data.is_authenticated;
            $rootScope.$broadcast('warehaus.state.update', res.data);
        }, function() {
            $timeout(self.refresh, 1000);
        });
    };

    self.refresh();

    return self;
});

angular.module('warehaus.state').run(function($rootScope, warehausState) {
    $rootScope.warehausState = warehausState;
});
