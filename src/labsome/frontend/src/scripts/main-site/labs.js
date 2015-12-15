'use strict';

angular.module('labsome.site.labs', [
    'labsome.site.hardware'
]);

angular.module('labsome.site.labs').provider('labsUrlRoutes', function(hardwareUrlRoutesProvider, viewPath) {
    var lab_page_children = [
        {
            name: 'manage',
            url: '/manage',
            title: 'Manage',
            templateUrl: viewPath('main-site/views/labs/manage/index.html'),
            autoRedirectToChild: 'add-servers',
            children: [
                {
                    name: 'add-servers',
                    url: '/add-servers',
                    title: 'Add servers',
                    templateUrl: viewPath('main-site/views/labs/manage/add-servers.html'),
                    controller: 'AddServersController'
                },
                {
                    name: 'set-hardware-types',
                    url: '/hardware-types',
                    title: 'Hardware Types',
                    templateUrl: viewPath('main-site/views/labs/manage/hardware-types.html'),
                    controller: 'SetHardwareTypesController'
                }
            ]
        }
    ];

    var hardware_children = hardwareUrlRoutesProvider.$get();

    var labs_url_routes = {
        name: 'labs',
        url: '/labs',
        title: 'Labs',
        templateUrl: viewPath('main-site/views/labs/index.html'),
        controller: 'AllLabsController',
        children: [
            {
                name: 'lab-page',
                url: '/:labSlug',
                title: 'Lab',
                templateUrl: viewPath('main-site/views/labs/lab-page.html'),
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
                    }]
                },
                children: lab_page_children.concat(hardware_children)
            }
        ]
    };

    return {
        $get: function() {
            return labs_url_routes;
        }
    };
});

angular.module('labsome.site.labs').config(function($urlRouterProvider, stateHelperProvider, labsUrlRoutesProvider) {
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

angular.module('labsome.site.labs').factory('allLabs', function($http, $rootScope, $q, socketIo) {
    var ready_promise = $q.defer();

    var self = {
        ready: false,
        all: [],
        byId: {},
        bySlug: {},
        whenReady: ready_promise.promise
    };

    var refresh = function() {
        return $http.get('/api/hardware/v1/labs').then(function(res) {
            self.all = res.data.objects;
            self.byId = {};
            self.bySlug = {};
            for (var i = 0; i < self.all.length; ++i) {
                var lab = self.all[i];
                self.byId[lab.id] = lab;
                self.bySlug[lab.slug] = lab;
            }
            self.ready = true;
            $rootScope.$broadcast('labsome.labs_inventory_changed');
            ready_promise.resolve();
        });
    };

    self.create = function(lab) {
        return $http.post('/api/hardware/v1/labs', lab);
    };

    self.update = function(lab_id, update) {
        return $http.put('/api/hardware/v1/labs/' + lab_id, update);
    };

    self.delete = function(lab_id) {
        return $http.delete('/api/hardware/v1/labs/' + lab_id);
    };

    refresh();

    socketIo.on('object_changed:lab', refresh);
    socketIo.on('object_deleted:lab', refresh);

    return self;
});

angular.module('labsome.site.labs').factory('labObjects', function($rootScope, $http, $q, socketIo) {
    var ready_promise = $q.defer();

    var self = {
        ready: false,
        objects: [],
        byLabId: {},
        byObjectType: {},
        byObjectId: {},
        whenReady: ready_promise.promise
    };

    var refresh = function() {
        return $http.get('/api/hardware/v1/objects').then(function(res) {
            self.objects = res.data.objects;
            self.byLabId = {};
            self.byObjectType = {};
            self.byObjectId = {};
            for (var i = 0; i < self.objects.length; ++i) {
                var obj = self.objects[i];
                if (angular.isDefined(obj.lab_id)) {
                    if (angular.isUndefined(self.byLabId[obj.lab_id])) {
                        self.byLabId[obj.lab_id] = {
                            all: [],
                            byObjectType: {}
                        };
                    }
                    self.byLabId[obj.lab_id].all.push(obj);
                    if (angular.isUndefined(self.byLabId[obj.lab_id].byObjectType[obj.type_key])) {
                        self.byLabId[obj.lab_id].byObjectType[obj.type_key] = [];
                    }
                    self.byLabId[obj.lab_id].byObjectType[obj.type_key].push(obj);
                }
                if (angular.isUndefined(self.byObjectType[obj.type_key])) {
                    self.byObjectType[obj.type_key] = [];
                }
                self.byObjectType[obj.type_key].push(obj);
                self.byObjectId[obj.id] = obj;
            }
            self.ready = true;
            $rootScope.$broadcast('labsome.objects_inventory_changed');
            ready_promise.resolve();
        });
    };

    refresh();

    socketIo.on('object_changed:object', refresh);
    socketIo.on('object_deleted:object', refresh);

    return self;
});

angular.module('labsome.site.labs').factory('objectTypes', function($rootScope, $http) {
    var self = {
        all: [],
        byTypeKey: {}
    };

    $http.get('/api/hardware/v1/types').then(function(res) {
        self.all = res.data.types;
        self.byTypeKey = {};
        for (var i = 0; i < self.all.length; ++i) {
            var type = self.all[i];
            self.byTypeKey[type.type_key] = type;
        }
        $rootScope.$broadcast('labsome.object_types_refreshed');
    });

    return self;
});

angular.module('labsome.site.labs').service('selectedLab', function() {
    this.lab_id = undefined;
    this.set = function(new_lab_id) {
        this.lab_id = new_lab_id;
    };
});

angular.module('labsome.site.labs').controller('AllLabsController', function($scope, $state, selectedLab, allLabs) {
    var _goto_lab = function(lab_id) {
        $state.go('labs.lab-page', {labSlug: allLabs.byId[lab_id].slug});
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

    $scope.$on('labsome.labs_inventory_changed', refresh);

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        if (toState.name == 'labs') {
            refresh();
        }
    });
});

angular.module('labsome.site.labs').controller('LabPageController', function($scope, $state, selectedLab, allLabs, labObjects, objectTypes, labSlug) {
    $scope.lab_slug = labSlug;
    $scope.lab_id = undefined;
    if (allLabs.bySlug[$scope.lab_slug]) {
        $scope.lab_id = allLabs.bySlug[$scope.lab_slug].id;
    }
    selectedLab.set($scope.lab_id);

    $scope.type_name_from_key = function(type_key) {
        return allLabs.byId[$scope.lab_id].type_naming[type_key].name_plural;
    };

    var _first_type_key = function(active_types) {
        var type_key = active_types[0];
        active_types.forEach(function(other_type_key) {
            if ($scope.type_name_from_key(other_type_key) < $scope.type_name_from_key(type_key)) {
                type_key = other_type_key;
            }
        });
        return type_key;
    };

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

    $scope.$on('labsome.labs_inventory_changed', refresh);

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        if (toState.name == 'labs.lab-page') {
            refresh();
        }
    });
});

angular.module('labsome.site.admin').controller('AddServersController', function($scope, $location) {
    var base_url = $location.protocol() + '://' + $location.host();
    if ((($location.protocol() == 'http') && ($location.port() != 80)) ||
        (($location.protocol() == 'https') && ($location.port() != 443))) {
        base_url += ':' + $location.port();
    }

    $scope.agent_url = base_url + '/api/hardware/v1/builtin/server/code/agent.py?lab_id=' + $scope.lab_id;
});

angular.module('labsome.site.admin').controller('SetHardwareTypesController', function($scope, $state, allLabs, objectTypes) {
    $scope.result = {
        active_types: angular.copy(allLabs.byId[$scope.lab_id].active_types || []),
        type_naming: angular.copy(allLabs.byId[$scope.lab_id].type_naming || {})
    };

    $scope.selected_types = {};

    for (var i = 0; i < objectTypes.all.length; ++i) {
        var type = objectTypes.all[i];
        if ($scope.result.active_types.indexOf(type.type_key) != -1) {
            $scope.selected_types[type.type_key] = true;
        } else {
            $scope.selected_types[type.type_key] = false;
        }
    }

    $scope.toggle_type_selection = function(type_key) {
        $scope.selected_types[type_key] = !$scope.selected_types[type_key];
        if ($scope.selected_types[type_key]) {
            $scope.result.active_types.push(type_key);
            if (!$scope.result.type_naming[type_key]) {
                $scope.result.type_naming[type_key] = {
                    name_singular: objectTypes.byTypeKey[type_key].display_name.toLowerCase(),
                    name_plural: objectTypes.byTypeKey[type_key].display_name.toLowerCase() + 's'
                };
            }
        } else {
            $scope.result.active_types.splice($scope.result.active_types.indexOf(type_key), 1);
        }
    };

    $scope.save_changes = function() {
        allLabs.update($scope.lab_id, $scope.result);
        $state.go('^');
    };
});

angular.module('labsome.site.labs').controller('CurrentObjectTypeController', function($scope, $state, allLabs, labObjects, typeKey) {
    $scope.type_key = typeKey;

    var refresh = function() {
        $scope.objects = undefined;
        if (!allLabs.ready) {
            return;
        }
        if (angular.isUndefined(allLabs.byId[$scope.lab_id]) ||
            angular.isUndefined(allLabs.byId[$scope.lab_id].active_types) ||
            (allLabs.byId[$scope.lab_id].active_types.indexOf($scope.type_key) == -1)) {
            $state.go('^');
            return;
        }
        var lab_objects = labObjects.byLabId[$scope.lab_id];
        if (angular.isUndefined(lab_objects)) {
            return;
        }
        $scope.objects = lab_objects.byObjectType[$scope.type_key];
    };

    refresh();

    $scope.$on('labsome.labs_inventory_changed', refresh);
    $scope.$on('labsome.object_types_refreshed', refresh);
    $scope.$on('labsome.objects_inventory_changed', refresh);
    $scope.$on('$stateChangeSuccess', refresh);
});

angular.module('labsome.site.labs').controller('ObjectActionController', function($scope, $state, viewPath, allLabs, labId, typeKey, actionName, objId) {
    $scope.viewPath = viewPath;
    $scope.lab_id = labId;
    if (!$scope.lab_id) {
        $state.go('^');
    }
    $scope.type_key = typeKey;
    $scope.action_name = actionName;
    $scope.object_id = objId;
});

angular.module('labsome.site.labs').directive('labName', function(allLabs) {
    var link = function(scope, elem, attrs) {
        scope.allLabs = allLabs;
    };

    return {
        restrict: 'AE',
        template: ' {{ allLabs.byId[id].display_name }}',
        link: link,
        scope: {
            'id': '='
        }
    };
});

angular.module('labsome.site.labs').directive('objectName', function(labObjects) {
    var link = function(scope, elem, attrs) {
        scope.labObjects = labObjects;
    };

    return {
        restrict: 'AE',
        template: ' {{ labObjects.byObjectId[id].display_name }}',
        link: link,
        scope: {
            'id': '='
        }
    };
});

angular.module('labsome.site.labs').run(function($rootScope, allLabs, labObjects, objectTypes) {
    $rootScope.allLabs = allLabs;
    $rootScope.labObjects = labObjects;
    $rootScope.objectTypes = objectTypes;
});
