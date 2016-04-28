'use strict';

angular.module('warehaus.ui_helpers', [
    'ui.router',
    'ui.router.stateHelper',
    'ui.router.title',
    'ui.bootstrap',
    'ui.select',
    'angular.filter',
    'angular-spinkit',
    'ngSanitize',
    'ngOrderObjectBy',
    'slugifier',
    'ngNumeraljs',
    'ngPassword',
    'angularMoment'
]);

angular.module('warehaus.ui_helpers').config(function($numeraljsConfigProvider) {
    $numeraljsConfigProvider.setFormat('capacity', '0,0.00 b');
});

angular.module('warehaus.ui_helpers').run(function($rootScope, $state) {
    $rootScope.moment = moment;
    $rootScope.$state = $state;
    $rootScope.number = parseFloat;
});

angular.module('warehaus.ui_helpers').constant('viewPath', function(uri) {
    return '/inline/' + uri;
});

angular.module('warehaus.ui_helpers').provider('urlRegister', function($urlRouterProvider, stateHelperProvider) {
    var register_auto_redirects = function(base_url, state) {
        var cur_url = base_url + state.url;
        if (state.autoRedirectToChild) {
            if (state.children) {
                state.children.forEach(function(child_state) {
                    if (child_state.name === state.autoRedirectToChild) {
                        $urlRouterProvider.when(cur_url, cur_url + child_state.url);
                    }
                });
            }
        }
        if (state.children) {
            state.children.forEach(function(child_state) {
                register_auto_redirects(cur_url, child_state);
            });
        }
    };

    var register_routes = function(routes) {
        register_auto_redirects('', routes);
        stateHelperProvider.state(routes);
    };

    return {
        $get: function() {
            return register_routes;
        }
    };
});

angular.module('warehaus.ui_helpers').directive('focusMe', function($timeout) {
    var link = function(scope, element, attrs) {
        scope.$watch(attrs.focusMe, function(value) {
            if (value) { 
                element[0].focus();
            }
        });
    };

    return {
        link: link
    };
});

angular.module('warehaus.ui_helpers').filter('titlecase', function() {
    return function(s) {
        s = ( s === undefined || s === null ) ? '' : s;
        return s.toString().toLowerCase().replace( /(^[a-z])|[-\s]([a-z])/g, function(ch) {
            return ch.toUpperCase();
        });
    };
});

var _is_empty = function(o) {
    if (o === undefined || o === null) {
        return true;
    }

    if (Array.isArray(o)) {
        return o.length === 0;
    }

    if (typeof o === 'object') {
        return Object.getOwnPropertyNames(o).length === 0;
    }

    return o;
};

angular.module('warehaus.ui_helpers').filter('isEmpty', function() {
    return _is_empty;
});

angular.module('warehaus.ui_helpers').filter('isNotEmpty', function() {
    return function(o) {
        return !_is_empty(o);
    };
});

angular.module('warehaus.ui_helpers').directive('preventDefault', function() {
    var link = function(scope, elem, attrs) {
        elem.on('click', function(event) {
            event.preventDefault();
        });
    };

    return {
        restrict: 'A',
        link: link
    };
});

angular.module('warehaus.ui_helpers').controller('ModalBase', function($scope, $uibModalInstance) {
    $scope.do_work = function() {
        // Inheriting controllers should return a promise here
    };

    var failure = function(res) {
        $scope.working = false;
        $scope.error = res.data.message || res.data || res;
    };

    $scope.save = function() {
        $scope.working = true;
        return $scope.do_work().then($uibModalInstance.close, failure);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

angular.module('warehaus.ui_helpers').directive('whErrorBox', function() {
    return {
        restrict: 'E',
        template: '<div class="alert alert-danger" ng-if="error"><strong><i class="fa fa-warning"> </i> Oh no</strong><p>{{ error }}</p></div>',
        scope: true
    };
});

angular.module('warehaus.ui_helpers').filter('count', function() {
    return function(o) {
        if (o === undefined || o === null) {
            return 0;
        }

        if (Array.isArray(o)) {
            return o.length;
        }

        if (typeof o === 'object') {
            return Object.getOwnPropertyNames(o).length;
        }
    };
});
