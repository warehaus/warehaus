'use strict';

angular.module('warehaus.models').service('socketIoManager', function($rootScope, $log, socketFactory) {
    var socket = undefined;

    $rootScope.$on('warehaus.auth.user_authorized', function() {
        if (angular.isDefined(socket)) {
            return;
        }
        $log.info('Creating new socketio');
        socket = socketFactory();
        $rootScope.$broadcast('warehaus.models.new_socket_available', socket);
    });

    $rootScope.$on('warehaus.auth.user_unauthorized', function() {
        if (angular.isUndefined(socket)) {
            return;
        }
        $log.info('Disconnecting socketio');
        socket.removeAllListeners();
        socket.disconnect();
        socket = undefined;
    });
});
