'use strict';

angular.module('warehaus.models', [
    'btford.socket-io'
]);

angular.module('warehaus.models').run(function($rootScope, dbObjects, dbTypeClasses, allLabs, socketIoManager) {
    $rootScope.dbObjects = dbObjects;
    $rootScope.dbTypeClasses = dbTypeClasses;
    $rootScope.allLabs = allLabs;
});
