'use strict';

angular.module('labsome.common').filter('titlecase', function() {
    return function(s) {
        s = ( s === undefined || s === null ) ? '' : s;
        return s.toString().toLowerCase().replace( /\b([a-z])/g, function(ch) {
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

angular.module('labsome.common').filter('isEmpty', function() {
    return _is_empty;
});

angular.module('labsome.common').filter('isNotEmpty', function() {
    return function(o) {
        return !_is_empty(o);
    };
});
