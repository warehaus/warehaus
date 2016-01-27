'use strict';

angular.module('labsome.state', []);

angular.module('labsome.state').factory('labsomeState', function($rootScope, $http, $timeout) {
    var self = {};

    self.refresh = function() {
        $http.get('/api/v1/state').then(function(res) {
            self.loaded = true;
            self.is_initialized = res.data.is_initialized;
            self.is_authenticated = res.data.is_authenticated;
            $rootScope.$broadcast('labsome.state.update', res.data);
        }, function() {
            $timeout(self.refresh, 1000);
        });
    };

    self.refresh();

    return self;
});

angular.module('labsome.state').run(function($rootScope, labsomeState) {
    $rootScope.labsomeState = labsomeState;
});
