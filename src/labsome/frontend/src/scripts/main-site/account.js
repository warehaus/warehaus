'use strict';

angular.module('labsome.site.account', []);

angular.module('labsome.site.account').config(function($stateProvider, $urlRouterProvider, viewPath) {
    var account = {
        url: '/account',
        title: 'Account',
        views: {
            navbar: {
                templateUrl: viewPath('main-site/views/account/navbar.html')
            },
            main: {
                templateUrl: viewPath('main-site/views/account/index.html'),
                controller: 'AccountController'
            }
        }
    };

    var account_profile = {
        parent: account,
        url: '/profile',
        templateUrl: viewPath('main-site/views/account/profile.html')
    };

    var account_api_tokens = {
        parent: account,
        url: '/api-tokens',
        templateUrl: viewPath('main-site/views/account/api-tokens.html')
    };

    $urlRouterProvider.when(account.url, account.url + account_profile.url);

    $stateProvider.state('account', account);
    $stateProvider.state('account.profile', account_profile);
    $stateProvider.state('account.api-tokens', account_api_tokens);
});

angular.module('labsome.site.account').controller('AccountController', function($scope, curUser) {
    $scope.user = curUser;
});
