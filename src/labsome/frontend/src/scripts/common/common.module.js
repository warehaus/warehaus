'use strict';

angular.module('labsome.common', [
    'ui.router',
    'ui.router.stateHelper',
    'ui.router.title',
    'angular.filter',
    'ui.bootstrap',
    'ui.select',
    'ngSanitize',
    'slugifier',
    'labsome.templates'
]);

angular.module('labsome.common').run(function($rootScope, $state) {
    $rootScope.moment = moment;
    $rootScope.$state = $state;
    $rootScope.number = parseFloat;
});
