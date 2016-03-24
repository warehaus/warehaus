'use strict';

angular.module('warehaus.hardware.server', [
    'warehaus.models'
]);

angular.module('warehaus.hardware.server').constant('hwServerTypeKey', 'builtin-server');

angular.module('warehaus.hardware.server').provider('serverView', function(viewPath, hwServerTypeKey) {
    return {
        $get: function() {
            return function(viewName) {
                return viewPath('main-site/hardware/' + hwServerTypeKey + '/' + viewName);
            };
        }
    };
});

angular.module('warehaus.hardware.server').controller('ServerListController', function($scope, $location, $stateParams, dbObjects) {
    if (!$stateParams.tab) {
        $stateParams.tab = 'all';
    }
    $scope.tab = $stateParams.tab;

    var base_url = $location.protocol() + '://' + $location.host();
    if ((($location.protocol() == 'http') && ($location.port() != 80)) ||
        (($location.protocol() == 'https') && ($location.port() != 443))) {
        base_url += ':' + $location.port();
    }
    var lab = dbObjects.byId[$scope.lab_id];
    var type_obj = dbObjects.byId[$scope.type_obj_id];

    $scope.agent_url = base_url + '/api/v1/labs/' + lab.slug + '/~/' + type_obj.slug + '/agent.py';
});

angular.module('warehaus.hardware.server').controller('ServerPageController', function($scope, $http, $uibModal, dbObjects, serverView) {
    var lab = dbObjects.byId[$scope.lab_id];

    var server_uri = function() {
        var lab = dbObjects.byId[$scope.lab_id];
        var server = dbObjects.byId[$scope.obj_id];
        return '/api/v1/labs/' + lab.slug + '/' + server.slug + '/';
    };

    $scope.add_to_cluster = function() {
        $uibModal.open({
            templateUrl: serverView('add-to-cluster.html'),
            controller: 'ClusterSelectionController',
            resolve: {
                labId: function() {
                    return $scope.lab_id;
                },
                typeObjId: function() {
                    return $scope.type_obj_id;
                },
                server_id: function() {
                    return $scope.obj_id;
                }
            }
        }).result.then(function(cluster_id) {
            $http.put(server_uri($scope.obj_id) + 'cluster', {cluster_id: cluster_id});
        });
    };

    $scope.remove_from_cluster = function() {
        $http.put(server_uri() + 'cluster', {cluster_id: null});
    };
});

angular.module('warehaus.hardware.server').controller('ClusterSelectionController', function($scope, $uibModalInstance, dbObjects, labId, typeObjId, server_id, hwClusterTypeKey) {
    $scope.lab_id = labId;
    $scope.server_id = server_id;
    $scope.hwClusterTypeKey = hwClusterTypeKey;

    $scope.selected_cluster = undefined;

    $scope.select_cluster = function(cluster_id) {
        $scope.selected_cluster = cluster_id;
    };

    $scope.ok = function() {
        $uibModalInstance.close($scope.selected_cluster);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});
