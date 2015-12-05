'use strict';

angular.module('labsome.site.labs', []);

angular.module('labsome.site.labs').config(function($stateProvider, viewPath) {
    var labs = {
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

    var labs_lab_page = {
        parent: labs,
        url: '/:lab_id',
        title: 'Lab',
        templateUrl: viewPath('main-site/views/labs/lab-page.html'),
        controller: 'CurrentLabPageController'
    };

    $stateProvider.state('labs', labs);
    $stateProvider.state('labs.lab-page', labs_lab_page);
});

angular.module('labsome.site.labs').factory('allLabs', function($http, $rootScope) {
    var self = {
        ready: false,
        all: [],
        byId: {}
    };

    var _refresh = function() {
        return $http.get('/api/hardware/v1/labs').then(function(res) {
            self.ready = true;
            self.all = res.data.objects;
            self.byId = {};
            for (var i = 0; i < self.all.length; ++i) {
                var lab = self.all[i];
                self.byId[lab.id] = lab;
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
                    self.byLabId[obj.lab_id] = [];
                }
                self.byLabId[obj.lab_id].push(obj);
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
        $state.go('labs.lab-page', {lab_id: lab_id});
    };

    var _refresh = function() {
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

    $scope.$on('labsome.labs_inventory_changed', _refresh);

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        if (!toState.parent) {
            _refresh();
        }
    });
});

angular.module('labsome.site.labs').controller('CurrentLabPageController', function($scope, $state, $stateParams, selectedLab, allLabs, labObjects, objectTypes) {
    $scope.lab_id = $stateParams.lab_id;
    selectedLab.set($scope.lab_id);

    var _refresh_objects = function() {
        $scope.objectsByType = {};
        var active_types = allLabs.byId[$scope.lab_id].active_types;
        if (angular.isUndefined(active_types)) {
            return;
        }
        for (var i = 0; i < active_types.length; ++i) {
            $scope.objectsByType[active_types[i]] = [];
        }
        var objects = labObjects.byLabId[$scope.lab_id];
        if (angular.isUndefined(objects)) {
            return;
        }
        for (var i = 0; i < objects.length; ++i) {
            var obj = objects[i];
            if (angular.isDefined($scope.objectsByType[obj.type_key])) {
                $scope.objectsByType[obj.type_key].push(obj);
            }
        }
    };

    var _refresh = function() {
        if (!allLabs.ready) {
            return;
        }
        if (angular.isUndefined(allLabs.byId[$scope.lab_id])) {
            $state.go('^');
            return;
        }
        _refresh_objects();
        $scope.selected_type_key = undefined;
        for (var type_key in $scope.objectsByType) {
            $scope.selected_type_key = type_key;
            break;
        }
    };

    $scope.select_type = function(type_key) {
        $scope.selected_type_key = type_key;
    };

    _refresh();

    $scope.$on('labsome.labs_inventory_changed', _refresh);
    $scope.$on('labsome.objects_inventory_changed', _refresh_objects);
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
        template: '<span ng-include="\'' + viewPath("main-site/hardware/' + typeKey + '.html'") + '"></span>',
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
