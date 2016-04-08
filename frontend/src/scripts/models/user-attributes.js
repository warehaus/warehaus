'use strict';

angular.module('warehaus.models').directive('typeAttributes', function($http, $uibModal, viewPath, dbObjects) {
    var link = function(scope, elem, attrs) {
        scope.dbObjects = dbObjects;

        var start_working = function() {
            scope.working = true;
        };

        var stop_working = function() {
            scope.working = false;
        };

        var edit_attribute_modal = function(http_method, attr) {
            return $uibModal.open({
                templateUrl: viewPath('main-site/hardware/objects/type-attribute-modal.html'),
                controller: 'EditTypeAttributeController',
                resolve: {
                    typeObjId: function() {
                        return scope.typeObjId;
                    },
                    typeAttr: function() {
                        return angular.copy(attr);
                    },
                    httpMethod: function() {
                        return http_method;
                    },
                    attrUrl: attrs_url
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

        scope.new_attribute = function() {
            edit_attribute_modal($http.post);
        };

        scope.edit_attribute = function(attr) {
            edit_attribute_modal($http.put, attr);
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

angular.module('warehaus.labs').controller('EditTypeAttributeController', function($scope, $controller, $uibModalInstance, dbObjects, typeObjId, typeAttr, attrUrl, httpMethod) {
    $controller('ModalBase', {$scope: $scope, $uibModalInstance: $uibModalInstance});
    $scope.type_obj_id = typeObjId;
    $scope.action = angular.isDefined(typeAttr) ? 'Edit' : 'New';
    $scope.type_attr = typeAttr || {};

    $scope.do_work = function() {
        return httpMethod(attrUrl, {attr: $scope.type_attr});
    };
});

angular.module('warehaus.models').directive('objectAttributes', function($http, $uibModal, viewPath, dbObjects) {
    var link = function(scope, elem, attrs) {
        scope.dbObjects = dbObjects;

        var attrs_url = function(obj) {
            var path = 'attrs';
            while (angular.isDefined(obj)) {
                path = obj.slug + '/' + path;
                obj = dbObjects.byId[obj.parent_id];
            }
            return '/api/v1/labs/' + path;
        };

        scope.set_attribute = function(attr_slug, new_value) {
            var obj = dbObjects.byId[scope.objId];
            if (angular.isUndefined(obj)) {
                return;
            }
            var data = {
                slug: attr_slug,
                value: new_value
            };
            return $http.put(attrs_url(obj), data);
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
            objId: '=',
            showHeading: '='
        }
    };
});

angular.module('warehaus.models').controller('EditAttributeValueController', function($scope, $controller, $uibModalInstance, $q, objId, attrSlug, curValue) {
    $controller('ModalBase', {$scope: $scope, $uibModalInstance: $uibModalInstance});
    $scope.obj_id = objId;
    $scope.attr_slug = attrSlug;
    $scope.input = { value: curValue };

    $scope.do_work = function() {
        return $q.resolve($scope.input.value);
    };
});
