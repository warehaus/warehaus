'use strict';

angular.module('labsome.site.hardware.server', [
    'labsome.site.labs'
]);

angular.module('labsome.site.hardware.server').constant('hwServerTypeKey', 'builtin-server');

angular.module('labsome.site.hardware.server').provider('serverView', function(viewPath, hwServerTypeKey) {
    return {
        $get: function() {
            return function(viewName) {
                return viewPath('main-site/hardware/' + hwServerTypeKey + '/' + viewName);
            };
        }
    };
});

angular.module('labsome.site.hardware.server').provider('hwServerUrlRoutes', function(hwServerTypeKey, serverViewProvider) {
    var serverView = serverViewProvider.$get();
    return {
        $get: function() {
            return [
                {
                    name: hwServerTypeKey,
                    url: '/' + hwServerTypeKey,
                    templateUrl: serverView('index.html'),
                    controller: 'ServerListController',
                    resolve: {
                        $title: ['$filter', 'allLabs', 'labId', function($filter, allLabs, labId) {
                            return $filter('titlecase')(allLabs.byId[labId].type_naming[hwServerTypeKey].name_plural);
                        }]
                    },
                    children: [
                    ]
                }
            ];
        }
    };
});

angular.module('labsome.site.hardware.server').controller('ServerListController', function($scope, $controller, $http, $uibModal, hwServerTypeKey, serverView) {
    $controller('CurrentObjectTypeController', {
        $scope: $scope,
        typeKey: hwServerTypeKey
    });

    $scope.add_to_cluster = function(server_id) {
        $uibModal.open({
            templateUrl: serverView('add-to-cluster.html'),
            controller: 'ClusterSelectionController',
            resolve: {
                lab_id: function() {
                    return $scope.lab_id;
                },
                server_id: function() {
                    return server_id;
                }
            }
        }).result.then(function(cluster_id) {
            $http.put('/api/hardware/v1/' + hwServerTypeKey + '/' + server_id, {cluster_id: cluster_id});
        });
    };

    $scope.remove_from_cluster = function(server_id) {
        $http.put('/api/hardware/v1/' + hwServerTypeKey + '/' + server_id, {cluster_id: null});
    };
});

angular.module('labsome.site.hardware.server').controller('ClusterSelectionController', function($scope, $uibModalInstance, labObjects, hwClusterTypeKey, lab_id, server_id) {
    $scope.lab_id = lab_id;
    $scope.server_id = server_id;
    $scope.clusters = labObjects.byLabId[lab_id].byObjectType[hwClusterTypeKey];

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
