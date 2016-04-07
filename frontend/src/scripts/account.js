'use strict';

angular.module('warehaus.account', ['warehaus.ui_helpers']);

angular.module('warehaus.account').provider('accountView', function(viewPath) {
    return {
        $get: function() {
            return function(path) {
                return viewPath('main-site/views/account/' + path);
            };
        }
    };
});

angular.module('warehaus.account').provider('accountUrlPaths', function(accountViewProvider) {
    var accountView = accountViewProvider.$get();

    var url_paths = {
        name: 'account',
        url: '/account',
        views: {
            '': {
                templateUrl: accountView('index.html'),
                controller: 'AccountController'
            },
            'nav': {
                template: '<a ui-sref="labs"><i class="fa fa-angle-left"> </i> Back</a>'
            }
        },
        resolve: {
            $title: function() {
                return 'Account';
            }
        }
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

angular.module('warehaus.account').controller('AccountController', function($scope) {
});

angular.module('warehaus.account').directive('userRoleSelection', function(accountView) {
    return {
        restrict: 'E',
        templateUrl: accountView('user-role-selection.html'),
        scope: {
            roleVar: '='
        }
    };
});

angular.module('warehaus.account').directive('userProfile', function($uibModal, users, curUser, accountView) {
    var link = function(scope, elem, attrs) {
        scope.users = users;
        scope.curUser = curUser;

        var show_update_modal = function(templateFile) {
            return $uibModal.open({
                templateUrl: accountView(templateFile),
                controller: 'UpdateUserController',
                resolve: {
                    userId: function() {
                        return scope.userId;
                    }
                }
            });
        };

        scope.change_username = function() {
            return show_update_modal('change-username.html');
        };

        scope.change_password = function() {
            return show_update_modal('change-password.html');
        };

        scope.edit_display_name = function() {
            return show_update_modal('change-display-name.html');
        };

        scope.edit_email = function() {
            return show_update_modal('change-email.html');
        };

        scope.change_role = function() {
            return show_update_modal('change-role.html');
        };
    };

    return {
        restrict: 'E',
        templateUrl: accountView('user-profile.html'),
        link: link,
        scope: {
            'userId': '='
        }
    };
});

angular.module('warehaus.account').controller('UpdateUserController', function($scope, $uibModalInstance, users, userId) {
    $scope.userId = userId;
    $scope.updated_user = {};

    $scope.save = function() {
        $scope.working = true;
        users.update_user(userId, $scope.updated_user).then($uibModalInstance.close, function(res) {
            $scope.working = false;
            $scope.error = res.data.message || res.data;
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

angular.module('warehaus.account').directive('userApiTokens', function($http, users, accountView) {
    var link = function(scope, elem, attrs) {
        var tokens_url = function() {
            return '/api/auth/users/' + scope.userId + '/api-tokens';
        };

        var reload_tokens = function() {
            $http.get(tokens_url()).then(function(res) {
                scope.apiTokens = res.data.api_tokens;
            });
        };

        users.whenReady.then(reload_tokens);

        scope.create_new_token = function() {
            return $http.post(tokens_url());
        };

        scope.$on('warehaus.users.user_changed', function(event, user_id) {
            if (user_id === scope.userId) {
                reload_tokens();
            }
        });

        scope.$on('warehaus.users.user_deleted', function(event, user_id) {
            if (user_id === scope.userId) {
                scope.apiTokens = [];
            }
        });
    };

    return {
        restrict: 'E',
        templateUrl: accountView('api-tokens.html'),
        link: link,
        scope: {
            'userId': '='
        }
    };
});
