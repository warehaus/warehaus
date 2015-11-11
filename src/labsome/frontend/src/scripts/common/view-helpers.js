'use strict';

angular.module('labsome.common.view_helpers', [
    'ui.bootstrap',
    'ui.select',
    'ngSanitize'
]);

angular.module('labsome.common.view_helpers').constant('viewPath', function(uri) {
    return '/static/site/views/' + uri;
});

angular.module('labsome.common.view_helpers').directive('focusMe', ['$timeout', function($timeout) {
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
}]);

angular.module('labsome.common.view_helpers').directive('blurMe', ['$timeout', function($timeout) {
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
}]);
