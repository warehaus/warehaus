'use strict';

angular.module('labsome.site.labs', []);

angular.module('labsome.site.labs').config(function($stateProvider, viewPath) {
    $stateProvider.state('labs', {
        url: '/labs',
        title: 'Labs',
        templateUrl: viewPath('main-site/views/labs/index.html'),
        controller: 'LabsViewController'
    });

    $stateProvider.state('labs.create', {
        url: '/create',
        title: 'Create',
        onEnter: function($uibModal, $state) {
            $uibModal.open({
                templateUrl: viewPath('main-site/views/labs/create-lab.html'),
                controller: 'CreateLabController'
            }).result.finally(function() {
                $state.go('^');
            });
        }
    });
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

    _refresh();

    return self;
});

angular.module('labsome.site.labs').factory('curLab', function($rootScope, allLabs) {
    var self = {
        lab_id: undefined,
        all_except_current: []
    };

    var _set_all_except_current = function() {
        self.all_except_current = [];
        for (var i = 0; i < allLabs.all.length; ++i) {
            var other_lab = allLabs.all[i];
            if (other_lab.id != self.lab_id) {
                self.all_except_current.push(other_lab.id);
            }
        }
    };

    self.set = function(new_lab_id) {
        self.lab_id = new_lab_id;
        _set_all_except_current();
        $rootScope.$broadcast('labsome.current_lab_changed');
    };

    var _select_first_lab = function() {
        if (allLabs.all.length > 0) {
            self.set(allLabs.all[0].id);
        } else {
            self.set(undefined);
        }
    };

    $rootScope.$on('labsome.labs_inventory_changed', function(event) {
        if (angular.isUndefined(self.lab_id) || angular.isUndefined(allLabs.byId[self.lab_id])) {
            _select_first_lab();
        } else {
            _set_all_except_current();
        }
    });

    return self;
});

angular.module('labsome.site.labs').directive('labName', function(allLabs) {
    var link = function(scope, elem, attrs) {
        scope.allLabs = allLabs;
    };

    return {
        restrict: 'AE',
        template: '{{ allLabs.byId[id].name }}',
        link: link,
        scope: {
            'id': '='
        }
    };
});

angular.module('labsome.site.labs').controller('LabsViewController', function($scope, allLabs) {
});

angular.module('labsome.site.labs').controller('CreateLabController', function($scope, $uibModalInstance, allLabs) {
    $scope.lab = {};

    $scope.cancel = function() {
        $uibModalInstance.dismiss('close');
    };

    $scope.save = function() {
        $scope.working = true;
        allLabs.create($scope.lab).then($uibModalInstance.close, function(res) {
            $scope.working = false;
            if (angular.isDefined(res.data.message)) {
                $scope.error = res.data.message;
            } else {
                $scope.error = res.data;
            }
        });
    };
});

angular.module('labsome.site.labs').run(function($rootScope, allLabs, curLab) {
    $rootScope.allLabs = allLabs;
    $rootScope.curLab = curLab;
});
