'use strict';

angular.module('labsome.site.hardware.cluster', [
    'labsome.site.labs'
]);

angular.module('labsome.site.hardware.cluster').constant('hwClusterTypeKey', 'builtin-cluster');

angular.module('labsome.site.hardware.cluster').provider('hwClusterUrlRoutes', function(hwClusterTypeKey, viewPath) {
    return {
        $get: function() {
            return [
                {
                    name: hwClusterTypeKey,
                    url: '/' + hwClusterTypeKey,
                    title: hwClusterTypeKey, // XXX take title from lab's type_naming
                    templateUrl: viewPath('main-site/hardware/' + hwClusterTypeKey + '/index.html'),
                    controller: 'ClusterListController',
                    children: [
                    ]
                }
            ];
        }
    };
});

angular.module('labsome.site.hardware.cluster').service('clusterServersAssigner', function($rootScope, labObjects, hwServerTypeKey) {
    $rootScope.$on('labsome.objects_inventory_changed', function() {
        if (angular.isUndefined(labObjects.byObjectType[hwServerTypeKey])) {
            return;
        }
        for (var i = 0; i < labObjects.byObjectType[hwServerTypeKey].length; ++i) {
            var server = labObjects.byObjectType[hwServerTypeKey][i];
            if (server.cluster_id) {
                var cluster = labObjects.byObjectId[server.cluster_id];
                if (cluster) {
                    if (angular.isUndefined(cluster.servers)) {
                        cluster.servers = [];
                    }
                    cluster.servers.push(server.id);
                }
            }
        }
    });
});

angular.module('labsome.site.hardware.cluster').run(function(clusterServersAssigner) {
});

angular.module('labsome.site.hardware.cluster').controller('ClusterListController', function($scope, $controller, $http, $q, $uibModal, labObjects, curUser, viewPath, hwClusterTypeKey) {
    $controller('CurrentObjectTypeController', {
        $scope: $scope,
        typeKey: hwClusterTypeKey
    });

    $scope.create_cluster = function() {
        $uibModal.open({
            templateUrl: viewPath('main-site/hardware/' + hwClusterTypeKey + '/create.html'),
            controller: 'CreateClusterController',
            resolve: {
                lab_id: function() {
                    return $scope.lab_id;
                }
            }
        });
    };

    $scope.take_ownership = function(cluster_id) {
        $http.post('/api/hardware/v1/objects/' + cluster_id + '/ownership/' + curUser.id);
    };

    $scope.release_ownership = function(cluster_id) {
        for (var i = 0; i < labObjects.byObjectId[cluster_id].ownerships.length; ++i) {
            var ownership = labObjects.byObjectId[cluster_id].ownerships[i];
            $http.delete('/api/hardware/v1/objects/' + cluster_id + '/ownership/' + ownership.owner_id);
        }
    };

    $scope.delete_cluster = function(cluster_id) {
        $uibModal.open({
            templateUrl: viewPath('main-site/hardware/' + hwClusterTypeKey + '/delete.html'),
            controller: 'DeleteClusterController',
            resolve: {
                cluster_id: function() {
                    return cluster_id
                }
            }
        });
    };
});

angular.module('labsome.site.hardware.cluster').controller('CreateClusterController', function($scope, $uibModalInstance, $http, lab_id) {
    $scope.cluster = {
        lab_id: lab_id
    };

    $scope.create = function() {
        $scope.working = true;
        $http.post('/api/hardware/v1/builtin/cluster', $scope.cluster).then(function() {
            $uibModalInstance.close();
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

angular.module('labsome.site.hardware.cluster').controller('DeleteClusterController', function($scope, $uibModalInstance, $http, $q, labObjects, cluster_id) {
    $scope.cluster_id = cluster_id;

    $scope.ok = function() {
        var cluster = labObjects.byObjectId[cluster_id];
        var unassign_promises = [];
        if (cluster.servers) {
            for (var i = 0; i < cluster.servers.length; ++i) {
                var server_id = cluster.servers[i];
                unassign_promises.push($http.put('/api/hardware/v1/builtin/server/' + server_id, {cluster_id: null}));
            }
        }
        $q.all(unassign_promises).then(function() {
            $http.delete('/api/hardware/v1/builtin/cluster/' + cluster_id).then(function() {
                $uibModalInstance.close();
            });
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});
