'use strict';

angular.module('labsome.common').controller('TitleController', function($scope, $state) {
    $scope.title = undefined;

    var _refresh_title = function() {
        var result = 'Labsome';
        for (var state = $state.current; !angular.isUndefined(state); state = state.parent) {
            result = state.title + ' - ' + result;
        }
        $scope.title = result;
    };

    $scope.$on('$stateChangeSuccess', _refresh_title);
});
