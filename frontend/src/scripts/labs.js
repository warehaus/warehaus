'use strict';

angular.module('warehaus.labs', [
    'warehaus.models',
    'warehaus.hardware'
]);

angular.module('warehaus.labs').provider('labsUrlRoutes', function(viewPath) {
    var labsView = function(path) {
        return viewPath('main-site/views/labs/' + path);
    };

    var lab_page_children = [
        {
            name: 'browse-type',
            url: '/browse/:typeSlug?tab',
            template: '<div ng-include="type_template_path"/>',
            controller: 'BrowseTypeController',
            resolve: {
                typeSlug: ['$stateParams', function($stateParams) {
                    return $stateParams.typeSlug;
                }],
                typeObjId: ['$stateParams', 'dbObjects', 'labId', function($stateParams, dbObjects, labId) {
                    var lab = dbObjects.byId[labId];
                    if (angular.isUndefined(lab)) {
                        return undefined;
                    }
                    for (var type_obj_id in dbObjects.byParentId[lab.type_id]) {
                        var type_obj = dbObjects.byId[type_obj_id];
                        if (angular.isDefined(type_obj) && (type_obj.slug == $stateParams.typeSlug)) {
                            return type_obj_id;
                        }
                    }
                    return undefined;
                }],
                $title: ['$filter', 'dbObjects', 'typeObjId', function($filter, dbObjects, typeObjId) {
                    return $filter('titlecase')(dbObjects.byId[typeObjId].display_name.plural);
                }]
            },
            children: [
                {
                    name: 'object-page',
                    url: '/:objSlug',
                    views: {
                        '@': {
                            template: '<div ng-include="object_template_path"/>',
                            controller: 'ObjectPageController'
                        }
                    },
                    resolve: {
                        objSlug: ['$stateParams', function($stateParams) {
                            return $stateParams.objSlug;
                        }],
                        objId: ['$stateParams', 'dbObjects', 'labId', function($stateParams, dbObjects, labId) {
                            var lab = dbObjects.byId[labId];
                            if (angular.isUndefined(lab)) {
                                return undefined;
                            }
                            for (var obj_id in dbObjects.byParentId[lab.id]) {
                                var obj = dbObjects.byId[obj_id];
                                if (angular.isDefined(obj) && (obj.slug == $stateParams.objSlug)) {
                                    return obj_id;
                                }
                            }
                            return undefined;
                        }],
                        $title: ['dbObjects', 'objId', function(dbObjects, objId) {
                            return dbObjects.byId[objId].display_name;
                        }]
                    }
                }
            ]
        },
        {
            name: 'manage',
            url: '/manage',
            templateUrl: labsView('manage/index.html'),
            autoRedirectToChild: 'set-hardware-types',
            resolve: {
                $title: function() {
                    return 'Manage';
                }
            },
            children: [
                {
                    name: 'set-hardware-types',
                    url: '/hardware-types',
                    templateUrl: labsView('manage/hardware-types.html'),
                    controller: 'HardwareTypesController',
                    resolve: {
                        $title: function() {
                            return 'Hardware Types';
                        }
                    }
                },
                {
                    name: 'rename',
                    url: '/rename',
                    templateUrl: labsView('manage/rename-lab.html'),
                    controller: 'RenameLabController',
                    resolve: {
                        $title: function() {
                            return 'Rename';
                        }
                    }
                },
                {
                    name: 'delete',
                    url: '/delete',
                    templateUrl: labsView('manage/delete-lab.html'),
                    controller: 'DeleteLabController',
                    resolve: {
                        $title: function() {
                            return 'Delete';
                        }
                    }
                }
            ]
        }
    ];

    var labs_url_routes = {
        name: 'labs',
        url: '/labs',
        templateUrl: labsView('index.html'),
        controller: 'AllLabsController',
        resolve: {
            $title: function() {
                return 'Labs';
            }
        },
        children: [
            {
                name: 'lab-page',
                url: '/:labSlug',
                templateUrl: labsView('lab-page.html'),
                controller: 'LabPageController',
                resolve: {
                    labSlug: ['$stateParams', function($stateParams) {
                        return $stateParams.labSlug;
                    }],
                    labId: ['$stateParams', 'allLabs', function($stateParams, allLabs) {
                        return allLabs.whenReady.then(function() {
                            if (!allLabs.bySlug[$stateParams.labSlug]) {
                                return undefined;
                            }
                            return allLabs.bySlug[$stateParams.labSlug].id;
                        });
                    }],
                    $title: ['allLabs', 'labId', function(allLabs, labId) {
                        return allLabs.byId[labId].display_name;
                    }]
                },
                children: lab_page_children
            }
        ]
    };

    return {
        $get: function() {
            return labs_url_routes;
        }
    };
});

angular.module('warehaus.labs').config(function($urlRouterProvider, stateHelperProvider, labsUrlRoutesProvider) {
    var register_auto_redirects = function(base_url, state) {
        var cur_url = base_url + state.url;
        if (state.autoRedirectToChild) {
            if (state.children) {
                state.children.forEach(function(child_state) {
                    if (child_state.name == state.autoRedirectToChild) {
                        $urlRouterProvider.when(cur_url, cur_url + child_state.url);
                    }
                });
            }
        }
        if (state.children) {
            state.children.forEach(function(child_state) {
                register_auto_redirects(cur_url, child_state);
            });
        }
    };
    var labs_url_routes = labsUrlRoutesProvider.$get()
    register_auto_redirects('', labs_url_routes);
    stateHelperProvider.state(labs_url_routes);
});

angular.module('warehaus.labs').service('selectedLab', function($log) {
    this.lab_id = undefined;
    this.set = function(new_lab_id) {
        $log.info('Selecting lab:', new_lab_id);
        this.lab_id = new_lab_id;
    };
});

angular.module('warehaus.labs').controller('AllLabsController', function($scope, $log, $state, $uibModal, viewPath, selectedLab, allLabs) {
    var _goto_lab = function(lab_id) {
        var slug = allLabs.byId[lab_id].slug;
        $log.info('Redirecting to lab:', slug);
        $state.go('labs.lab-page', {labSlug: slug});
    };

    var refresh = function() {
        if (!allLabs.ready) {
            return;
        }
        if (angular.isUndefined(allLabs.byId[selectedLab.lab_id])) {
            selectedLab.set(undefined);
        }
        if (angular.isDefined(selectedLab.lab_id)) {
            _goto_lab(selectedLab.lab_id);
        } else if (allLabs.all.length > 0) {
            _goto_lab(allLabs.all[0].id);
        }
    }

    $scope.$on('warehaus.labs_inventory_changed', refresh);

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        if (toState.name == 'labs') {
            refresh();
        }
    });

    $scope.create_lab = function() {
        $uibModal.open({
            templateUrl: viewPath('main-site/views/labs/create-lab.html'),
            controller: 'CreateLabController'
        }).result.then(function(new_lab) {
            // Set selectedLab and wait for the new lab to be refreshed from
            // the database. When that happens the user will be redirected
            // to the new lab page.
            selectedLab.set(new_lab.id);
        });
    };
});

angular.module('warehaus.labs').controller('CreateLabController', function($scope, $state, $uibModalInstance, allLabs) {
    $scope.lab = {};

    $scope.save = function() {
        $scope.working = true;
        allLabs.create($scope.lab).then(function(res) {
            $uibModalInstance.close(res.data);
        }, function(res) {
            $scope.working = false;
            if (angular.isDefined(res.data.message)) {
                $scope.error = res.data.message;
            } else {
                $scope.error = res.data;
            }
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

angular.module('warehaus.labs').controller('LabPageController', function($scope, $state, $log, selectedLab, allLabs, labSlug) {
    $scope.lab_slug = labSlug;
    $scope.lab_id = undefined;
    if (allLabs.bySlug[$scope.lab_slug]) {
        $scope.lab_id = allLabs.bySlug[$scope.lab_slug].id;
    }
    selectedLab.set($scope.lab_id);

    var refresh = function() {
        if (!allLabs.ready) {
            return;
        }
        if (angular.isUndefined(allLabs.byId[$scope.lab_id])) {
            $state.go('^');
            return;
        }
        var active_types = allLabs.byId[$scope.lab_id].active_types;
        if (angular.isDefined(active_types) && (active_types.length > 0)) {
            $state.go('labs.lab-page.' + _first_type_key(active_types));
        }
    };

    refresh();

    $scope.$on('warehaus.labs_inventory_changed', refresh);

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        if (toState.name == 'labs.lab-page') {
            refresh();
        }
    });
});

angular.module('warehaus.labs').controller('BrowseTypeController', function($scope, $state, dbObjects, typeObjId, allLabs, viewPath) {
    $scope.type_obj_id = typeObjId;
    $scope.type_template_path = viewPath('main-site/hardware/' + dbObjects.byId[$scope.type_obj_id].type_key + '/index.html');

    var refresh = function() {
        $scope.objects = undefined;
        if (!allLabs.ready) {
            return;
        }
        if (angular.isUndefined(allLabs.byId[$scope.lab_id]) ||
            angular.isUndefined(dbObjects.byId[$scope.type_obj_id])) {
            $state.go('^');
            return;
        }
        $scope.objects = dbObjects.byTypeId[$scope.type_obj_id];
    };

    refresh();

    $scope.$on('warehaus.labs_inventory_changed', refresh);
    $scope.$on('warehaus.type_classes_loaded', refresh);
    $scope.$on('warehaus.models.objects_reloaded', refresh);
    $scope.$on('warehaus.models.object_changed', refresh);
    $scope.$on('warehaus.models.object_deleted', refresh);
    $scope.$on('$stateChangeSuccess', refresh);

});

angular.module('warehaus.labs').controller('ObjectPageController', function($scope, $state, dbObjects, labId, typeObjId, objId, viewPath) {
    $scope.lab_id = labId;
    $scope.type_obj_id = typeObjId;
    $scope.obj_id = objId;

    $scope.object_template_path = viewPath('main-site/hardware/' + dbObjects.byId[typeObjId].type_key + '/object-page.html');

    var reload_object = function() {
        $scope.object = dbObjects.byId[$scope.obj_id];
        if (angular.isUndefined($scope.object)) {
            $state.go('^');
        }
    };

    var reload_object_conditionally = function(event, obj_id) {
        if ($scope.obj_id == obj_id) {
            reload_object();
        }
    };

    $scope.$on('warehaus.models.objects_reloaded', reload_object);
    $scope.$on('warehaus.models.object_changed', reload_object_conditionally);
    $scope.$on('warehaus.models.object_deleted', reload_object_conditionally);
});

angular.module('warehaus.labs').controller('HardwareTypesController', function($scope, $state, $uibModal, allLabs, viewPath) {
    $scope.new_hardware_type = function() {
        $uibModal.open({
            templateUrl: viewPath('main-site/views/labs/manage/new-hardware-type.html'),
            controller: 'NewHardwareTypeController',
            resolve: {
                lab_id: function() {
                    return $scope.lab_id;
                }
            }
        });
    };

    $scope.delete_type = function(type_obj) {
        allLabs.delete_type_object($scope.lab_id, type_obj.id);
    };
});

angular.module('warehaus.labs').controller('NewHardwareTypeController', function($scope, $uibModalInstance, allLabs, dbTypeClasses, lab_id) {
    $scope.lab_id = lab_id;
    $scope.new_type = {
        display_name: {
            singular: '',
            plural: ''
        }
    };

    $scope.selection_changed = function() {
        var type_class = dbTypeClasses.byTypeKey[$scope.new_type.type_key];
        $scope.new_type.display_name.singular = type_class.display_name.toLowerCase();
        $scope.new_type.display_name.plural = type_class.display_name.toLowerCase() + 's';
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.create = function() {
        $scope.working = true;
        $scope.error = undefined;
        allLabs.create_type_object($scope.lab_id, $scope.new_type).then($uibModalInstance.close, function(res) {
            $scope.working = false;
            $scope.error = res.data;
        });
    };
});

angular.module('warehaus.labs').controller('RenameLabController', function($scope, $state, allLabs) {
    $scope.result = {
        display_name: allLabs.byId[$scope.lab_id].display_name
    };

    $scope.ok = function() {
        allLabs.update($scope.lab_id, $scope.result).then(function() {
            $state.go('labs');
        });
    };
});

angular.module('warehaus.labs').controller('DeleteLabController', function($scope, $state, allLabs) {
    $scope.ok = function() {
        allLabs.delete($scope.lab_id).then(function() {
            $state.go('labs');
        });
    };
});
