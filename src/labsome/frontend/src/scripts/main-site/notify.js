'use strict';

angular.module('labsome.notify', [
    'btford.socket-io'
]);

angular.module('labsome.notify').run(function($rootScope, socketFactory) {
    var socket = undefined;

    $rootScope.$on('labsome.auth.user_authorized', function() {
        if (angular.isDefined(socket)) {
            return;
        }
        socket = socketFactory();
        $rootScope.$broadcast('labsome.notify.new_socket_available', socket);
    });

    $rootScope.$on('labsome.auth.user_unauthorized', function() {
        if (angular.isUndefined(socket)) {
            return;
        }
        socket.removeAllListeners();
        socket.disconnect();
        socket = undefined;
    });
});
