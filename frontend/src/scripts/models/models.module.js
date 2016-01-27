'use strict';

angular.module('labsome.models', [
    'btford.socket-io'
]);

angular.module('labsome.models').run(function($rootScope, dbObjects, dbTypeClasses, allLabs, socketIoManager) {
    $rootScope.dbObjects = dbObjects;
    $rootScope.dbTypeClasses = dbTypeClasses;
    $rootScope.allLabs = allLabs;
});
