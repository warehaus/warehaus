'use strict';

angular.module('warehaus.models').factory('dbObjects', function($rootScope, $http, $log, $q, getObjectNotifications) {
    var ready_promise = $q.defer();

    var self = {
        isReady: false,
        whenReady: ready_promise.promise
    };

    self.hasType = function(obj) {
        return obj.type_id !== 'NO_TYPE';
    };

    self.hasParent = function(obj) {
        return obj.parent_id !== 'ROOT';
    };

    var reset_self = function() {
        self.byId = {};
        self.byParentId = {};
        self.byTypeId = {};
    };

    var insert_one = function(obj) {
        //$log.debug('Inserting object:', obj);
        self.byId[obj.id] = obj;
        if (self.hasParent(obj)) {
            if (angular.isUndefined(self.byParentId[obj.parent_id])) {
                self.byParentId[obj.parent_id] = {};
            }
            self.byParentId[obj.parent_id][obj.id] = obj;
        }
        if (obj.type_id) {
            if (angular.isUndefined(self.byTypeId[obj.type_id])) {
                self.byTypeId[obj.type_id] = {};
            }
            self.byTypeId[obj.type_id][obj.id] = obj;
        }
    };

    var load_all_objects = function() {
        return $http.get('/api/v1/hardware/objects').then(function(res) {
            reset_self();
            angular.forEach(res.data.objects, insert_one);
            self.isReady = true;
            $rootScope.$broadcast('warehaus.models.objects_reloaded');
            ready_promise.resolve();
        });
    };

    var object_changed = function(notification) {
        //$log.debug('Fetching changed object:', notification.object.id);
        insert_one(notification.object);
        $rootScope.$broadcast('warehaus.models.object_changed', notification.object.id);
    };

    var object_deleted = function(notification) {
        //$log.debug('Discarding deleted object:', notification.id);
        var obj = self.byId[notification.id];
        if (angular.isUndefined(obj)) {
            return;
        }
        if (self.hasParent(obj)) {
            if (angular.isDefined(self.byParentId[obj.parent_id])) {
                delete self.byParentId[obj.parent_id][obj.id];
            }
        }
        if (self.hasType(obj)) {
            if (angular.isDefined(self.byTypeId[obj.type_id])) {
                delete self.byTypeId[obj.type_id][obj.id];
            }
        }
        var deleted_obj = self.byId[notification.id];
        delete self.byId[notification.id];
        $rootScope.$broadcast('warehaus.models.object_deleted', notification.id, deleted_obj);
    };

    reset_self();

    getObjectNotifications('object', {
        on_new_socket: load_all_objects,
        on_changed: object_changed,
        on_deleted: object_deleted
    });

    return self;
});

angular.module('warehaus.models').factory('dbTypeClasses', function($rootScope, $http) {
    var self = {
        byTypeKey: {}
    };

    var load_one = function(type) {
        self.byTypeKey[type.type_key] = type;
    };

    var load_all = function() {
        $http.get('/api/v1/hardware/types').then(function(res) {
            self.byTypeKey = {};
            angular.forEach(res.data.types, load_one);
            $rootScope.$broadcast('warehaus.type_classes_loaded');
        });
    };

    $rootScope.$on('warehaus.auth.user_authorized', load_all);

    return self;
});

angular.module('warehaus.models').directive('objectName', function(dbObjects) {
    var link = function(scope, elem, attrs) {
        scope.dbObjects = dbObjects;
    };

    return {
        restrict: 'AE',
        template: ' {{ dbObjects.byId[id].display_name }}',
        link: link,
        scope: {
            'id': '='
        }
    };
});
