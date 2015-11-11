'use strict';

angular.module('labsome.common.auth', []);

angular.module('labsome.common.auth').factory('curUser', ['$rootScope', function($rootScope) {
    // All fields in `self` are `undefined` when not logged-in
    var self = {
        // Raw data as we get from the identity provider
        raw: undefined,
        // A profile object we compose internally for abstraction
        profile: undefined,
    };

    var get_display_name = function(raw_data) {
        switch(raw_data.provider) {
        case 'facebook':
            return raw_data.facebook.displayName;
        case 'twitter':
            return raw_data.twitter.displayName;
        case 'google':
            return raw_data.google.displayName;
        }
    };

    var get_user_email = function(raw_data) {
        switch(raw_data.provider) {
        case 'facebook':
            return raw_data.facebook.email;
        }
    };

    var profile_from_raw_data = function(raw_data) {
        if (!raw_data) {
            return undefined;
        }
        var profile = {};
        profile.uid = raw_data.uid;
        profile.display_name = get_display_name(raw_data);
        profile.email = get_user_email(raw_data);
        profile.created_at = new Date();
        profile.avatar_base_url = 'https://gravatar.com/avatar/' + md5(profile.email) + '?d=mm';
        profile.avatar_32 = profile.avatar_base_url + '&s=70';
        profile.avatar_96 = profile.avatar_base_url + '&s=192';
        return profile;
    };

    var update_user_record = function() {
        fbRoot.ref.child('users').child(self.raw.uid).set({
            provider: self.raw.provider,
            name: self.profile.display_name,
            email: self.profile.email
        });
    };

    var identity_changed = function(authData) {
        self.raw = authData;
        self.profile = profile_from_raw_data(self.raw);
        if (self.raw) {
            update_user_record();
        }
        $rootScope.$broadcast('labsome.identity_change', angular.copy(self.profile));
    };

    self.logout = function() {
        fbRoot.auth.$unauth();
    };

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
