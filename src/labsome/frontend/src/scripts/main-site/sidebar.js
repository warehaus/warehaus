'use strict';

angular.module('labsome.site').controller('SidebarController', ['$scope', function($scope){
    $scope.is_open = false;

    $scope.toggle_sidebar = function() {
        $scope.is_open = !$scope.is_open;
    };

    $scope.$on('$stateChangeSuccess', function(event) {
        $scope.is_open = false;
    });
}]);
