'use strict';

angular.module('labsome.common').controller('TitleController', function($scope, $state) {
    $scope.title = undefined;

    var _refresh_title = function() {
        var result = '';
        for (var state = $state.current; angular.isDefined(state); state = state.parent) {
            result += state.title + ' - ';
        }
        $scope.title = result + 'Labsome';
    };

    $scope.$on('$stateChangeSuccess', _refresh_title);
});
