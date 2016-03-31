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

    self.rename = function(lab_id, update) {
        var lab = self.byId[lab_id];
        return $http.put('/api/v1/labs/' + lab.slug + '/name', update);
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

angular.module('warehaus.models').directive('typeAttributes', function($http, $uibModal, viewPath, dbObjects) {
    var link = function(scope, elem, attrs) {
        scope.dbObjects = dbObjects;

        var edit_attribute_modal = function(attr) {
            return $uibModal.open({
                templateUrl: viewPath('main-site/hardware/objects/type-attribute-modal.html'),
                controller: 'EditTypeAttributeController',
                resolve: {
                    typeObjId: function() {
                        return scope.typeObjId;
                    },
                    typeAttr: function() {
                        return angular.copy(attr);
                    }
                }
            });
        };

        var attrs_url = function() {
            var lab = dbObjects.byId[scope.labId];
            var path_to_type_obj = '';
            for (var cur = dbObjects.byId[scope.typeObjId]; cur.slug && cur.parent_id; cur = dbObjects.byId[cur.parent_id]) {
                path_to_type_obj = cur.slug + '/' + path_to_type_obj;
            }
            return '/api/v1/labs/' + lab.slug + '/~/' + path_to_type_obj + 'attrs';
        };

        var start_working = function() {
            scope.working = true;
        };

        var stop_working = function() {
            scope.working = false;
        };

        scope.new_attribute = function() {
            edit_attribute_modal().result.then(function(new_attr) {
                start_working();
                $http.post(attrs_url(), {attr: new_attr}).then(stop_working);
            });
        };

        scope.edit_attribute = function(attr) {
            edit_attribute_modal(attr).result.then(function(changed_attr) {
                start_working();
                $http.put(attrs_url(), {attr: changed_attr}).then(stop_working);
            });
        };

        scope.delete_attribute = function(attr_slug) {
            start_working();
            var config = {
                headers: { 'Content-Type': 'application/json' },
                data: { slug: attr_slug }
            };
            $http.delete(attrs_url(), config).then(stop_working);
        };
    };

    return {
        restrict: 'E',
        templateUrl: viewPath('main-site/hardware/objects/type-attributes.html'),
        link: link,
        scope: {
            title: '@',
            labId: '=',
            typeObjId: '='
        }
    };
});

angular.module('warehaus.labs').controller('EditTypeAttributeController', function($scope, $uibModalInstance, dbObjects, typeObjId, typeAttr) {
    $scope.type_obj_id = typeObjId;
    $scope.action = angular.isDefined(typeAttr) ? 'Edit' : 'New';
    $scope.type_attr = typeAttr || {};

    $scope.ok = function() {
        $uibModalInstance.close($scope.type_attr);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

angular.module('warehaus.models').directive('objectAttributes', function($http, $uibModal, viewPath, dbObjects) {
    var link = function(scope, elem, attrs) {
        scope.dbObjects = dbObjects;

        scope.set_attribute = function(attr_slug, new_value) {
            var obj = dbObjects.byId[scope.objId];
            var lab = dbObjects.byId[obj.parent_id];
            if (angular.isUndefined(obj)) {
                return;
            }
            var data = {
                slug: attr_slug,
                value: new_value
            };
            return $http.put('/api/v1/labs/' + lab.slug + '/' + obj.slug + '/attrs', data);
        };

        scope.edit_text_attribute = function(attr_slug) {
            var obj = dbObjects.byId[scope.objId];
            var lab = dbObjects.byId[obj.parent_id];
            if (angular.isUndefined(obj)) {
                return;
            }
            $uibModal.open({
                templateUrl: viewPath('main-site/hardware/objects/edit-attribute.html'),
                controller: 'EditAttributeValueController',
                resolve: {
                    objId: function() {
                        return scope.objId;
                    },
                    attrSlug: function() {
                        return attr_slug;
                    },
                    curValue: function() {
                        if (angular.isUndefined(obj.attrs)) {
                            return null;
                        }
                        return angular.copy(obj.attrs[attr_slug]);
                    }
                }
            }).result.then(function(new_value) {
                return scope.set_attribute(attr_slug, new_value);
            });
        };

        scope.delete_attribute = function(attr_slug) {
            return scope.set_attribute(attr_slug, null);
        };
    };

    return {
        restrict: 'E',
        templateUrl: viewPath('main-site/hardware/objects/object-attributes.html'),
        replace: true,
        link: link,
        scope: {
            objId: '='
        }
    };
});

angular.module('warehaus.models').controller('EditAttributeValueController', function($scope, $uibModalInstance, objId, attrSlug, curValue) {
    $scope.obj_id = objId;
    $scope.attr_slug = attrSlug;
    $scope.input = { value: curValue };

    $scope.ok = function() {
        $uibModalInstance.close($scope.input.value);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});
