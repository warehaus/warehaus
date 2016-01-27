'use strict';

angular.module('labsome.models').factory('dbObjects', function($rootScope, $http, $log, $q) {
    var ready_promise = $q.defer();

    var self = {
        isReady: false,
        whenReady: ready_promise.promise
    };

    var reset_self = function() {
        self.byId = {};
        self.byParentId = {};
        self.byTypeId = {};
    };

    var insert_one = function(obj) {
        $log.debug('Inserting object:', obj);
        self.byId[obj.id] = obj;
        if (obj.parent_id) {
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

    var load_all = function() {
        return $http.get('/api/v1/hardware/objects').then(function(res) {
            reset_self();
            angular.forEach(res.data.objects, insert_one);
            self.isReady = true;
            $rootScope.$broadcast('labsome.models.objects_reloaded');
            ready_promise.resolve();
        });
    };

    var object_changed = function(notification) {
        $log.debug('Fetching changed object:', notification.id);
        return $http.get('/api/v1/hardware/objects/' + notification.id).then(function(res) {
            insert_one(res.data);
            $rootScope.$broadcast('labsome.models.object_changed', notification.id);
        });
    };

    var object_deleted = function(notification) {
        $log.debug('Discarding deleted object:', notification.id);
        var obj = self.byId[notification.id];
        if (angular.isUndefined(obj)) {
            return;
        }
        if (obj.parent_id) {
            if (angular.isDefined(self.byParentId[obj.parent_id])) {
                delete self.byParentId[obj.parent_id][obj.id];
            }
        }
        if (obj.type_id) {
            if (angular.isDefined(self.byTypeId[obj.type_id])) {
                delete self.byTypeId[obj.type_id][obj.id];
            }
        }
        var deleted_obj = self.byId[notification.id];
        delete self.byId[notification.id];
        $rootScope.$broadcast('labsome.models.object_deleted', notification.id, deleted_obj);
    };

    reset_self();

    $rootScope.$on('labsome.models.new_socket_available', function(event, socket) {
        socket.on('object_changed:object', object_changed);
        socket.on('object_deleted:object', object_deleted);
        load_all();
    });

    return self;
});

angular.module('labsome.models').factory('dbTypeClasses', function($rootScope, $http) {
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
            $rootScope.$broadcast('labsome.type_classes_loaded');
        });
    };

    $rootScope.$on('labsome.auth.user_authorized', load_all);

    return self;
});

angular.module('labsome.models').directive('objectName', function(dbObjects) {
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
