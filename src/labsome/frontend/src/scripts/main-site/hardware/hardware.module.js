'use strict';

angular.module('labsome.site.hardware', [
    'labsome.site.hardware.server',
    'labsome.site.hardware.cluster'
]);

angular.module('labsome.site.hardware').provider('hardwareUrlRoutes', function(hwServerUrlRoutesProvider, hwClusterUrlRoutesProvider) {
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
