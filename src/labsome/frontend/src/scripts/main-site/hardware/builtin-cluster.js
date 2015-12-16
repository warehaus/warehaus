'use strict';

angular.module('labsome.site.hardware.cluster', [
    'labsome.site.labs'
]);

angular.module('labsome.site.hardware.cluster').constant('hwClusterTypeKey', 'builtin-cluster');

angular.module('labsome.site.hardware.cluster').provider('clusterView', function(viewPath, hwClusterTypeKey) {
    return {
        $get: function() {
            return function(viewName) {
                return viewPath('main-site/hardware/' + hwClusterTypeKey + '/' + viewName);
            };
        }
    };
});

angular.module('labsome.site.hardware.cluster').provider('hwClusterUrlRoutes', function(hwClusterTypeKey, clusterViewProvider) {
    var clusterView = clusterViewProvider.$get();

    var cluster_page = {
        name: 'cluster-page',
        url: '/:clusterSlug',
        resolve: {
            clusterId: ['$stateParams', 'labObjects', 'labId', function($stateParams, labObjects, labId) {
                return labObjects.whenReady.then(function() {
                    if (angular.isUndefined(labId)) {
                        return undefined;
                    }
                    if (angular.isUndefined(labObjects.byLabId[labId])) {
                        return undefined;
                    }
                    var cluster_id;
                    labObjects.byLabId[labId].byObjectType[hwClusterTypeKey].forEach(function(cluster) {
                        if (cluster.slug == $stateParams.clusterSlug) {
                            cluster_id = cluster.id;
                        }
                    });
                    return cluster_id;
                });
            }],
            $title: ['clusterId', 'labObjects', function(clusterId, labObjects) {
                return labObjects.byObjectId[clusterId].display_name;
            }]
        },
        views: {
            '@': {
                templateUrl: clusterView('cluster-page.html'),
                controller: 'ClusterPageController'
            }
        }
    };

    return {
        $get: function() {
            return [
                {
                    name: hwClusterTypeKey,
                    url: '/' + hwClusterTypeKey,
                    templateUrl: clusterView('index.html'),
                    controller: 'ClusterListController',
                    resolve: {
                        $title: ['$filter', 'allLabs', 'labId', function($filter, allLabs, labId) {
                            return $filter('titlecase')(allLabs.byId[labId].type_naming[hwClusterTypeKey].name_plural);
                        }]
                    },
                    children: [
                        cluster_page
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

angular.module('labsome.site.hardware.cluster').controller('ClusterListController', function($scope, $controller, $http, $uibModal, hwClusterTypeKey, clusterView) {
    $controller('CurrentObjectTypeController', {
        $scope: $scope,
        typeKey: hwClusterTypeKey
    });

    $scope.create_cluster = function() {
        $uibModal.open({
            templateUrl: clusterView('create.html'),
            controller: 'CreateClusterController',
            resolve: {
                lab_id: function() {
                    return $scope.lab_id;
                }
            }
        });
    };
});

angular.module('labsome.site.hardware.cluster').controller('ClusterPageController', function($scope, $controller, $http, $uibModal, $state, labObjects, curUser, hwClusterTypeKey, clusterView, labId, clusterId) {
    if (angular.isUndefined(clusterId)) {
        $state.go('^');
    }

    $scope.lab_id = labId;
    $scope.cluster = labObjects.byObjectId[clusterId];

    $scope.$on('labsome.objects_inventory_changed', function() {
        $scope.cluster = labObjects.byObjectId[clusterId];
    });

    $scope.take_ownership = function() {
        $http.post('/api/hardware/v1/objects/' + $scope.cluster.id + '/ownership/' + curUser.id);
    };

    $scope.release_ownership = function() {
        for (var i = 0; i < $scope.cluster.ownerships.length; ++i) {
            var ownership = $scope.cluster.ownerships[i];
            $http.delete('/api/hardware/v1/objects/' + $scope.cluster.id + '/ownership/' + ownership.owner_id);
        }
    };

    $scope.delete_cluster = function() {
        $uibModal.open({
            templateUrl: clusterView('delete.html'),
            controller: 'DeleteClusterController',
            resolve: {
                cluster_id: function() {
                    return $scope.cluster.id;
                }
            }
        }).result.then(function() {
            $state.go('^');
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
