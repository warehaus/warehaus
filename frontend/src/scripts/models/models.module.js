'use strict';

angular.module('warehaus.models', []);

angular.module('warehaus.models').run(function($rootScope, dbObjects, dbTypeClasses, allLabs, socketIoManager) {
    $rootScope.dbObjects = dbObjects;
    $rootScope.dbTypeClasses = dbTypeClasses;
    $rootScope.allLabs = allLabs;
});
