'use strict';

angular.module('warehaus.hardware.generic_object', [
    'warehaus.models'
]);

angular.module('warehaus.hardware.generic_object').constant('hwGenericObjectTypeKey', 'builtin-generic-object');

angular.module('warehaus.hardware.generic_object').provider('genericObjectView', function(viewPath, hwGenericObjectTypeKey) {
    return {
        $get: function() {
            return function(viewName) {
                return viewPath('labs/hardware/' + hwGenericObjectTypeKey + '/' + viewName);
            };
        }
    };
});

angular.module('warehaus.hardware.generic_object').controller('GenericObjectListController', function($scope, $http, $uibModal, hwGenericObjectTypeKey, genericObjectView) {
    $scope.create_object = function() {
        $uibModal.open({
            templateUrl: genericObjectView('create.html'),
            controller: 'CreateObjectController',
            resolve: {
                labId: function() {
                    return $scope.lab_id;
                },
                typeObjId: function() {
                    return $scope.type_obj_id;
                }
            }
        });
    };
});
