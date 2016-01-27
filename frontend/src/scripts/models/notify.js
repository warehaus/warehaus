'use strict';

angular.module('labsome.models').service('socketIoManager', function($rootScope, $log, socketFactory) {
    var socket = undefined;

    $rootScope.$on('labsome.auth.user_authorized', function() {
        if (angular.isDefined(socket)) {
            return;
        }
        $log.info('Creating new socketio');
        socket = socketFactory();
        $rootScope.$broadcast('labsome.models.new_socket_available', socket);
    });

    $rootScope.$on('labsome.auth.user_unauthorized', function() {
        if (angular.isUndefined(socket)) {
            return;
        }
        $log.info('Disconnecting socketio');
        socket.removeAllListeners();
        socket.disconnect();
        socket = undefined;
    });
});
