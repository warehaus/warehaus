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

angular.module('warehaus.hardware.server').controller('ServerListController', function($scope, $stateParams, dbObjects, siteUrl) {
    if (!$stateParams.tab) {
        $stateParams.tab = 'all';
    }
    $scope.tab = $stateParams.tab;

    var lab = dbObjects.byId[$scope.lab_id];
    var type_obj = dbObjects.byId[$scope.type_obj_id];

    $scope.agent_url = siteUrl('/api/v1/labs/' + lab.slug + '/~/' + type_obj.slug + '/agent.py');
});

angular.module('warehaus.hardware.server').controller('ServerPageController', function($scope, $http, $uibModal, dbObjects, serverView) {
    var update = function() {
        return dbObjects.whenReady.then(function() {
            $scope.server = dbObjects.byId[$scope.obj_id];

            $scope.pci_devices = [];
            $scope.network_interfaces = [];
            $scope.disks = []

            angular.forEach(dbObjects.byParentId[$scope.obj_id], function(subobj) {
                if (angular.isUndefined(subobj)) {
                    return;
                }
                var subobj_type = dbObjects.byId[subobj.type_id];
                if (angular.isUndefined(subobj_type)) {
                    return;
                }
                switch (subobj_type.slug) {
                case 'pci-device':
                    $scope.pci_devices.push(subobj);
                    break;
                case 'network-interface':
                    $scope.network_interfaces.push(subobj);
                    break;
                case 'disk':
                    $scope.disks.push(subobj);
                    break;
                default:
                    break;
                }
            });
        });
    };

    update();
    $scope.$on('warehaus.models.objects_reloaded', update);
    $scope.$on('warehaus.models.object_changed', update);
    $scope.$on('warehaus.models.object_deleted', update);

    var server_uri = function(action) {
        return dbObjects.whenReady.then(function() {
            var lab = dbObjects.byId[$scope.lab_id];
            var server = dbObjects.byId[$scope.obj_id];
            return '/api/v1/labs/' + lab.slug + '/' + server.slug + '/' + (action ? action : '');
        });
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
            return server_uri('cluster').then(function(uri) {
                return $http.put(uri, {cluster_id: cluster_id});
            });
        });
    };

    $scope.remove_from_cluster = function() {
        return server_uri('cluster').then(function(uri) {
            return $http.put(uri, {cluster_id: null});
        });
    };

    $scope.show_agent_error = function(error) {
        $uibModal.open({
            templateUrl: serverView('agent-error.html'),
            controller: 'AgentErrorController',
            size: 'lg',
            resolve: {
                error: function() {
                    return error;
                }
            }
        });
    };
});

angular.module('warehaus.hardware.server').controller('ClusterSelectionController', function($scope, $controller, $uibModalInstance, $q, dbObjects, labId, typeObjId, server_id, hwClusterTypeKey) {
    $controller('ModalBase', {$scope: $scope, $uibModalInstance: $uibModalInstance});
    $scope.lab_id = labId;
    $scope.server_id = server_id;
    $scope.hwClusterTypeKey = hwClusterTypeKey;

    $scope.selected_cluster = undefined;

    $scope.select_cluster = function(cluster_id) {
        $scope.selected_cluster = cluster_id;
    };

    $scope.do_work = function() {
        return $q.resolve($scope.selected_cluster);
    };
});

angular.module('warehaus.hardware.server').controller('AgentErrorController', function($scope, $controller, $uibModalInstance, error) {
    $controller('ModalBase', {$scope: $scope, $uibModalInstance: $uibModalInstance});
    $scope.error = error;
});
