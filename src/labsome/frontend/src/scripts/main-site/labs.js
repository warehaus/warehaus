'use strict';

angular.module('labsome.site.labs', []);

angular.module('labsome.site.labs').config(function($stateProvider, viewPath) {
    var labs = {
        name: 'labs',
        url: '/labs',
        title: 'Labs',
        views: {
            navbar: {
                templateUrl: viewPath('main-site/views/labs/lab-selector.html'),
                controller: 'LabSelectorController'
            },
            main: {
                templateUrl: viewPath('main-site/views/labs/index.html'),
                controller: 'AllLabsController'
            }
        }
    };

    var lab_page = {
        name: labs.name + '.lab-page',
        parent: labs,
        url: '/:lab_name',
        title: 'Lab',
        templateUrl: viewPath('main-site/views/labs/lab-page.html'),
        controller: 'CurrentLabPageController'
    };

    var object_type = {
        name: lab_page.name + '.object-type',
        parent: lab_page,
        url: '/:type_key',
        title: 'Object Type',
        templateUrl: viewPath('main-site/views/labs/objects-list.html'),
        controller: 'CurrentObjectTypeController',
        resolve: {
            type_key: ['$stateParams', function($stateParams) {
                return $stateParams.type_key;
            }]
        }
    };

    var object_action = {
        name: object_type.name + '.object-action',
        parent: object_type,
        url: '/:action_name',
        title: 'Action',
        templateUrl: viewPath('main-site/views/labs/object-action.html'),
        controller: 'ObjectActionController',
        resolve: {
            action_name: ['$stateParams', function($stateParams) {
                return $stateParams.action_name;
            }]
        }
    };

    $stateProvider.state(labs);
    $stateProvider.state(lab_page);
    $stateProvider.state(object_type);
    $stateProvider.state(object_action);
});

angular.module('labsome.site.labs').factory('allLabs', function($http, $rootScope) {
    var self = {
        ready: false,
        all: [],
        byId: {},
        byName: {}
    };

    var _refresh = function() {
        return $http.get('/api/hardware/v1/labs').then(function(res) {
            self.ready = true;
            self.all = res.data.objects;
            self.byId = {};
            for (var i = 0; i < self.all.length; ++i) {
                var lab = self.all[i];
                self.byId[lab.id] = lab;
                self.byName[lab.name.toLowerCase()] = lab;
            }
            $rootScope.$broadcast('labsome.labs_inventory_changed');
        });
    };

    self.create = function(lab) {
        return $http.post('/api/hardware/v1/labs', lab).then(_refresh);
    };

    self.update = function(lab_id, update) {
        return $http.put('/api/hardware/v1/labs/' + lab_id, update).then(_refresh);
    };

    self.delete = function(lab_id) {
        return $http.delete('/api/hardware/v1/labs/' + lab_id).then(_refresh);
    };

    _refresh();

    return self;
});

angular.module('labsome.site.labs').factory('labObjects', function($rootScope, $http) {
    var self = {
        objects: [],
        byLabId: {},
        byObjectId: {}
    };

    $http.get('/api/hardware/v1/objects').then(function(res) {
        self.objects = res.data.objects;
        self.byLabId = {};
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
            if (angular.isUndefined(self.byObjectId[obj.id])) {
                self.byObjectId[obj.id] = [];
            }
            self.byObjectId[obj.id].push(obj);
        }
        $rootScope.$broadcast('labsome.objects_inventory_changed');
    });

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

angular.module('labsome.site.labs').controller('LabSelectorController', function($scope, selectedLab) {
    $scope.selectedLab = selectedLab;
});

angular.module('labsome.site.labs').controller('AllLabsController', function($scope, $state, selectedLab, allLabs) {
    var _goto_lab = function(lab_id) {
        $state.go('labs.lab-page', {lab_name: allLabs.byId[lab_id].name.toLowerCase()});
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

angular.module('labsome.site.labs').controller('CurrentLabPageController', function($scope, $state, $stateParams, selectedLab, allLabs, labObjects, objectTypes) {
    $scope.lab_name = $stateParams.lab_name;
    $scope.lab_id = undefined;
    if (allLabs.byName[$scope.lab_name]) {
        $scope.lab_id = allLabs.byName[$scope.lab_name.toLowerCase()].id;
    }
    selectedLab.set($scope.lab_id);

    var refresh = function() {
        if (!allLabs.ready) {
            return false;
        }
        if (angular.isUndefined(allLabs.byId[$scope.lab_id])) {
            $state.go('^');
            return false;
        }
        return true;
    };

    refresh();

    $scope.$on('labsome.labs_inventory_changed', refresh);

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        if (toState.name == 'labs.lab-page') {
            if (refresh()) {
                var active_types = allLabs.byId[$scope.lab_id].active_types;
                if (angular.isDefined(active_types) && (active_types.length > 0)) {
                    $state.go('labs.lab-page.object-type', {type_key: active_types[0]});
                }
            }
        }
    });
});

angular.module('labsome.site.labs').controller('CurrentObjectTypeController', function($scope, $state, allLabs, type_key) {
    $scope.type_key = type_key;

    var refresh = function() {
        if (!allLabs.ready) {
            return;
        }
        if (angular.isUndefined(allLabs.byId[$scope.lab_id]) ||
            angular.isUndefined(allLabs.byId[$scope.lab_id].active_types) ||
            (allLabs.byId[$scope.lab_id].active_types.indexOf($scope.type_key) == -1)) {
            $state.go('^');
            return;
        }
    };

    refresh();

    $scope.$on('labsome.labs_inventory_changed', refresh);

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        if (toState.name == 'labs.lab-page.object-type') {
            refresh();
        }
    });
});

angular.module('labsome.site.labs').controller('ObjectActionController', function($scope, viewPath, type_key, action_name) {
    $scope.viewPath = viewPath;
    $scope.type_key = type_key;
    $scope.action_name = action_name;
});

angular.module('labsome.site.labs').directive('labName', function(allLabs) {
    var link = function(scope, elem, attrs) {
        scope.allLabs = allLabs;
    };

    return {
        restrict: 'AE',
        template: ' {{ allLabs.byId[id].name }}',
        link: link,
        scope: {
            'id': '='
        }
    };
});

angular.module('labsome.site.labs').directive('objectsList', function(curUser, allLabs, labObjects, objectTypes, viewPath) {
    var link = function(scope, elem, attrs) {
        scope.curUser = curUser;
        scope.allLabs = allLabs;
        scope.labObjects = labObjects;
        scope.objectTypes = objectTypes;
    };

    return {
        restrict: 'AE',
        template: '<span ng-include="\'' + viewPath("main-site/hardware/' + typeKey + '/index.html'") + '"></span>',
        link: link,
        scope: {
            labId: '=',
            typeKey: '=',
            objects: '='
        }
    };
});

angular.module('labsome.site.labs').run(function($rootScope, allLabs, labObjects, objectTypes) {
    $rootScope.allLabs = allLabs;
    $rootScope.labObjects = labObjects;
    $rootScope.objectTypes = objectTypes;
});
