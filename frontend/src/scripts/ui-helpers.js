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
    'slugifier',
    'ngNumeraljs'
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

angular.module('warehaus.ui_helpers').directive('blurMe', function($timeout) {
    var link = function(scope, element, attrs) {
        scope.$watch(attrs.blurMe, function(value) {
            if (value) {
                element[0].blur();
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
        return o.length == 0;
    }

    if (typeof o === 'object') {
        return Object.getOwnPropertyNames(o).length == 0;
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
