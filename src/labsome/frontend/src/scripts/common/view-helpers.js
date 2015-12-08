'use strict';

angular.module('labsome.common').constant('viewPath', function(uri) {
    return '/static/templates/' + uri;
});

angular.module('labsome.common').directive('focusMe', function($timeout) {
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

angular.module('labsome.common').directive('blurMe', function($timeout) {
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
