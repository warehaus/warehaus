'use strict';

angular.module('labsome.hardware.server', [
    'labsome.models'
]);

angular.module('labsome.hardware.server').constant('hwServerTypeKey', 'builtin-server');

angular.module('labsome.hardware.server').provider('serverView', function(viewPath, hwServerTypeKey) {
    return {
        $get: function() {
            return function(viewName) {
                return viewPath('main-site/hardware/' + hwServerTypeKey + '/' + viewName);
            };
        }
    };
});

angular.module('labsome.hardware.server').controller('ServerListController', function($scope, $location, $http, $stateParams, $uibModal, dbObjects, serverView) {
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

    var server_uri = function(server_id) {
        var lab = dbObjects.byId[$scope.lab_id];
        var server = dbObjects.byId[server_id];
        return '/api/v1/labs/' + lab.slug + '/' + server.slug + '/';
    };

    $scope.add_to_cluster = function(server_id) {
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
                    return server_id;
                }
            }
        }).result.then(function(cluster_id) {
            $http.put(server_uri(server_id) + 'cluster', {cluster_id: cluster_id});
        });
    };

    $scope.remove_from_cluster = function(server_id) {
        $http.put(server_uri(server_id) + 'cluster', {cluster_id: null});
    };
});

angular.module('labsome.hardware.server').controller('ClusterSelectionController', function($scope, $uibModalInstance, dbObjects, labId, typeObjId, server_id, hwClusterTypeKey) {
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
