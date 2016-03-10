'use strict';

angular.module('warehaus.hardware.cluster', [
    'warehaus.models'
]);

angular.module('warehaus.hardware.cluster').constant('hwClusterTypeKey', 'builtin-cluster');

angular.module('warehaus.hardware.cluster').provider('clusterView', function(viewPath, hwClusterTypeKey) {
    return {
        $get: function() {
            return function(viewName) {
                return viewPath('main-site/hardware/' + hwClusterTypeKey + '/' + viewName);
            };
        }
    };
});

angular.module('warehaus.hardware.cluster').factory('clustersToServers', function($rootScope, $log, dbObjects, hwClusterTypeKey, hwServerTypeKey) {
    var self = {
        cluster_of_server: {}, // {server_id: cluster_id}
        servers_of_cluster: {} // {cluster_id: [server_id, server_id, ...]}
    };

    var add_server_to_cluster = function(server_id, cluster_id) {
        if (angular.isUndefined(self.servers_of_cluster[cluster_id])) {
            self.servers_of_cluster[cluster_id] = [];
        }
        if (angular.isDefined(self.cluster_of_server[server_id])) {
            if (self.cluster_of_server[server_id] == cluster_id) {
                return;
            } else {
                remove_server_from_cluster(server_id);
            }
        }
        $log.debug('Adding server', server_id, 'to cluster', cluster_id);
        self.cluster_of_server[server_id] = cluster_id;
        self.servers_of_cluster[cluster_id].push(server_id);
    };

    var remove_server_from_cluster = function(server_id) {
        if (self.cluster_of_server[server_id]) {
            var cluster_id = self.cluster_of_server[server_id];
            var index = self.servers_of_cluster[cluster_id].indexOf(server_id);
            if (index != -1) {
                self.servers_of_cluster[cluster_id].splice(index, 1);
            }
        }
        delete self.cluster_of_server[server_id];
    };

    var remove_cluster_from_servers = function(cluster_id) {
        if (self.servers_of_cluster[cluster_id]) {
            angular.forEach(self.servers_of_cluster[cluster_id], function(server_id) {
                delete self.cluster_of_server[server_id];
            });
        }
        delete self.servers_of_cluster[cluster_id];
    };

    var update_server = function(server) {
        if (!server) {
            return;
        }
        var cluster = dbObjects.byId[server.cluster_id];
        if (cluster) {
            add_server_to_cluster(server.id, cluster.id);
        } else if (self.cluster_of_server[server.id]) {
            remove_server_from_cluster(server.id);
        }
    };

    var refresh = function() {
        if (!dbObjects.isReady) {
            return;
        }
        angular.forEach(dbObjects.byTypeId, function(objects, type_id) {
            var type = dbObjects.byId[type_id];
            if (angular.isDefined(type) && (type.type_key == hwServerTypeKey)) {
                angular.forEach(objects, function(obj) {
                    update_server(obj);
                });
            }
        });
    };

    $rootScope.$on('warehaus.models.objects_reloaded', refresh);

    refresh();

    var call_if_typeclass = function(obj, type_key, callback) {
        var type_obj = dbObjects.byId[obj.type_id];
        if (obj && type_obj && (type_obj.type_key == type_key)) {
            callback(obj);
        }
    };

    $rootScope.$on('warehaus.models.object_changed', function(event, obj_id) {
        var obj = dbObjects.byId[obj_id];
        call_if_typeclass(obj, hwServerTypeKey, update_server);
    });

    $rootScope.$on('warehaus.models.object_deleted', function(event, obj_id, deleted_obj) {
        call_if_typeclass(deleted_obj, hwServerTypeKey, function() {
            remove_server_from_cluster(obj_id);
        });
        call_if_typeclass(deleted_obj, hwClusterTypeKey, function() {
            remove_cluster_from_servers(obj_id);
        });
    });

    return self;
});

angular.module('warehaus.hardware.cluster').run(function($rootScope, clustersToServers) {
    $rootScope.clustersToServers = clustersToServers;
});

//----------------------------------------------------------------------------//
// Cluster list
//----------------------------------------------------------------------------//

angular.module('warehaus.hardware.cluster').controller('ClusterListController', function($scope, $http, $uibModal, hwClusterTypeKey, clusterView) {
    $scope.create_cluster = function() {
        $uibModal.open({
            templateUrl: clusterView('create.html'),
            controller: 'CreateClusterController',
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

angular.module('warehaus.hardware.cluster').controller('CreateClusterController', function($scope, $uibModalInstance, $http, dbObjects, labId, typeObjId) {
    $scope.lab_id = labId;
    $scope.type_obj_id = typeObjId;
    $scope.cluster = {};

    $scope.create = function() {
        $scope.working = true;
        var type_obj_url = '/api/v1/labs/' + dbObjects.byId[$scope.lab_id].slug + '/~/' + dbObjects.byId[$scope.type_obj_id].slug + '/';
        $http.post(type_obj_url, $scope.cluster).then($uibModalInstance.close);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

//----------------------------------------------------------------------------//
// Cluster page
//----------------------------------------------------------------------------//

angular.module('warehaus.hardware.cluster').controller('ClusterPageController', function($scope, $http, $uibModal, $state, dbObjects, curUser, hwClusterTypeKey, clusterView) {
    var cluster_uri = function() {
        var lab = dbObjects.byId[$scope.lab_id];
        var cluster = dbObjects.byId[$scope.obj_id];
        return '/api/v1/labs/' + lab.slug + '/' + cluster.slug + '/';
    };

    $scope.take_ownership = function() {
        $http.post(cluster_uri() + 'owner', {username: curUser.username});
    };

    $scope.release_ownership = function() {
        $http.delete(cluster_uri() + 'owner');
    };

    $scope.show_config_json = function() {
        $uibModal.open({
            templateUrl: clusterView('show-config-json.html'),
            controller: 'ShowClusterConfigJsonController',
            size: 'lg',
            resolve: {
                labId: function() {
                    return $scope.lab_id;
                },
                typeObjId: function() {
                    return $scope.type_obj_id;
                },
                objId: function() {
                    return $scope.obj_id;
                },
                configJson: function() {
                    return $http.get(cluster_uri() + 'config.json').then(function(res) {
                        return res.data;
                    });
                }
            }
        });
    };

    $scope.delete_cluster = function() {
        $uibModal.open({
            templateUrl: clusterView('delete.html'),
            controller: 'DeleteClusterController',
            resolve: {
                labId: function() {
                    return $scope.lab_id;
                },
                typeObjId: function() {
                    return $scope.type_obj_id;
                },
                objId: function() {
                    return $scope.obj_id;
                }
            }
        }).result.then(function() {
            $state.go('^');
        });
    };
});

angular.module('warehaus.hardware.cluster').controller('DeleteClusterController', function($scope, $uibModalInstance, $http, $q, dbObjects, labId, typeObjId, objId) {
    $scope.lab_id = labId;
    $scope.type_obj_id = typeObjId;
    $scope.obj_id = objId;

    $scope.ok = function() {
        var cluster = dbObjects.byId[$scope.obj_id];
        var lab = dbObjects.byId[$scope.lab_id];
        var unassign_promises = [];
        if (cluster.servers) {
            for (var i = 0; i < cluster.servers.length; ++i) {
                var server_id = cluster.servers[i];
                var server = dbObjects.byId[server_id];
                unassign_promises.push($http.put('/api/v1/labs/' + lab.slug + '/' + server.slug + '/cluster', {cluster_id: null}));
            }
        }
        $q.all(unassign_promises).then(function() {
            $http.delete('/api/v1/labs/' + lab.slug + '/' + cluster.slug + '/').then($uibModalInstance.close);
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

angular.module('warehaus.hardware.cluster').controller('ShowClusterConfigJsonController', function($scope, $uibModalInstance, labId, typeObjId, objId, configJson) {
    $scope.lab_id = labId;
    $scope.type_obj_id = typeObjId;
    $scope.obj_id = objId;
    $scope.config_json = configJson;

    $scope.close = function() {
        $uibModalInstance.dismiss('cancel');
    };
});
