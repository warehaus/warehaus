'use strict';

angular.module('warehaus.models').factory('allLabs', function($http, $rootScope, $log, $q, dbObjects) {
    var ready_promise = $q.defer();

    var self = {
        ready: false,
        whenReady: ready_promise.promise
    };

    var reset_self = function() {
        self.all = [];
        self.byId = {};
        self.bySlug = {};
    };

    var is_lab = function(obj) {
        return obj && (obj.parent_id === null) && (obj.type_id !== null);
    };

    var add_lab = function(lab) {
        $log.debug('Found lab:', lab);
        self.all.push(lab);
        self.byId[lab.id] = lab;
        self.bySlug[lab.slug] = lab;
    };

    var refresh = function() {
        $log.info('Refreshing labs');
        reset_self();
        angular.forEach(dbObjects.byId, function(obj) {
            if (is_lab(obj)) {
                add_lab(obj);
            }
        });
        self.ready = true;
        $rootScope.$broadcast('warehaus.labs_inventory_changed');
        ready_promise.resolve();
    };

    self.create = function(lab) {
        $log.info('Creating new lab:', lab);
        return $http.post('/api/v1/labs', lab);
    };

    self.create_type_object = function(lab_id, new_type) {
        var lab = self.byId[lab_id];
        $log.info('Creating new type object', new_type, 'in lab', lab.slug);
        return $http.post('/api/v1/labs/' + lab.slug + '/type-objects', new_type);
    };

    self.delete_type_object = function(lab_id, type_obj_id) {
        var lab = self.byId[lab_id];
        var type_obj = dbObjects.byId[type_obj_id];
        return $http.delete('/api/v1/labs/' + lab.slug + '/~/' + type_obj.slug + '/');
    };

    self.update = function(lab_id, update) {
        return $http.put('/api/v1/labs/' + lab_id, update);
    };

    self.delete = function(lab_id) {
        var lab = self.byId[lab_id];
        return $http.delete('/api/v1/labs/' + lab.slug + '/');
    };

    $rootScope.$on('warehaus.models.objects_reloaded', refresh);

    $rootScope.$on('warehaus.models.object_changed', function(event, obj_id) {
        var obj = dbObjects.byId[obj_id];
        if (is_lab(obj)) {
            refresh();
        }
    });

    $rootScope.$on('warehaus.models.object_deleted', function(event, obj_id) {
        if (angular.isDefined(self.byId[obj_id])) {
            refresh();
        }
    });

    reset_self();

    return self;
});

angular.module('warehaus.models').directive('labName', function(allLabs) {
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

angular.module('warehaus.models').directive('objectTypeName', function(dbObjects) {
    var link = function(scope, elem, attrs) {
        scope.dbObjects = dbObjects;
    };

    return {
        restrict: 'AE',
        template: '{{ dbObjects.byId[typeId].display_name[(sample == 1) ? "singular" : "plural"] }}',
        link: link,
        scope: {
            typeId: '=',
            sample: '@'
        }
    };
});

angular.module('warehaus.models').directive('objectTypeTitle', function(dbObjects) {
    var link = function(scope, elem, attrs) {
        scope.dbObjects = dbObjects;
    };

    return {
        restrict: 'AE',
        template: '{{ dbObjects.byId[typeId].display_name[(sample == 1) ? "singular" : "plural"] | titlecase }}',
        link: link,
        scope: {
            typeId: '=',
            sample: '@'
        }
    };
});

angular.module('warehaus.models').directive('objectCountWithType', function() {
    return {
        restrict: 'AE',
        template: '{{ (!count && (count != 0)) ? "" : (count + " ") }}<object-type-title type-id="typeId" sample="{{ count }}"/>',
        scope: {
            typeId: '=',
            count: '@'
        }
    };
});
