'use strict';

angular.module('labsome.common', [
    'ui.router',
    'angular.filter',
    'labsome.common.view_helpers'
]);

angular.module('labsome.common').run(function($rootScope, $state) {
    $rootScope.moment = moment;
    $rootScope.$state = $state;
    $rootScope.number = parseFloat;
});
