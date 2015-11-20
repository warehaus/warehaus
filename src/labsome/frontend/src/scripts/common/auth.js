'use strict';

angular.module('labsome.common.auth', []);

angular.module('labsome.common.auth').factory('curUser', ['$rootScope', '$http', function($rootScope, $http) {
    // All fields in `self` are `undefined` when not logged-in
    var self = {
        // Raw data as we get from the identity provider
        raw: undefined,
        // A profile object we compose internally for abstraction
        profile: undefined,
    };

    var profile_from_raw_data = function(raw_data) {
        var profile = {};
        profile.display_name = raw_data.username;
        profile.email = raw_data.email || '';
        profile.avatar_base_url = 'https://gravatar.com/avatar/' + md5(profile.email) + '?d=mm';
        profile.avatar_32 = profile.avatar_base_url + '&s=70';
        profile.avatar_96 = profile.avatar_base_url + '&s=192';
        return profile;
    };

    var refresh = function() {
        $http.get('/api/auth/v1/self').then(function(response) {
            self.raw = response.data;
            self.profile = profile_from_raw_data(self.raw);
            $rootScope.$broadcast('labsome.identity_change', angular.copy(self.profile));
        });
    };

    refresh();

    return self;
}]);

angular.module('labsome.common.auth').controller('UserProfileController', ['$scope', '$http', 'curUser', function($scope, $http, curUser) {
    $scope.profile = curUser.profile;
    $scope.$on('labsome.identity_change', function(event, new_identity) {
        $scope.profile = new_identity;
    });
}]);

angular.module('labsome.common.auth').run(['$rootScope', 'curUser', function($rootScope, curUser) {
    $rootScope.curUser = curUser;
}]);
