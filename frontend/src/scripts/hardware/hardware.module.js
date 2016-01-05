'use strict';

angular.module('labsome.hardware', [
    'labsome.hardware.server',
    'labsome.hardware.cluster'
]);

angular.module('labsome.hardware').provider('hardwareUrlRoutes', function(hwServerUrlRoutesProvider, hwClusterUrlRoutesProvider) {
    var hardware_url_routes = [].concat(
        hwServerUrlRoutesProvider.$get(),
        hwClusterUrlRoutesProvider.$get()
    );
    return {
        $get: function() {
            return hardware_url_routes;
        }
    };
});
