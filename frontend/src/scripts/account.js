'use strict';

angular.module('warehaus.account', ['warehaus.ui_helpers']);

angular.module('warehaus.account').provider('accountUrlPaths', function(viewPath) {
    var url_paths = {
        name: 'account',
        url: '/account',
        autoRedirectToChild: 'profile',
        views: {
            '': {
                templateUrl: viewPath('main-site/views/account/index.html'),
                controller: 'AccountController',
            },
            'nav': {
                template: '<a ui-sref="labs"><i class="fa fa-angle-left"> </i> Back</a>'
            }
        },
        resolve: {
            $title: function() {
                return 'Account';
            }
        },
        children: [
            {
                name: 'profile',
                url: '/profile',
                templateUrl: viewPath('main-site/views/account/profile.html')
            },
            {
                name: 'api-tokens',
                url: '/api-tokens',
                templateUrl: viewPath('main-site/views/account/api-tokens.html')
            }
        ]
    };

    return {
        $get: function() {
            return url_paths;
        }
    };
});

angular.module('warehaus.account').config(function(urlRegisterProvider, accountUrlPathsProvider) {
    urlRegisterProvider.$get()(accountUrlPathsProvider.$get());
});

angular.module('warehaus.account').controller('AccountController', function($scope, curUser) {
    $scope.user = curUser;
});
