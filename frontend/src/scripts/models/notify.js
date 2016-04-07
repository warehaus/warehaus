'use strict';

angular.module('warehaus.models').service('socketIoManager', function($rootScope, $log, socketFactory) {
    var socket;

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

angular.module('warehaus.models').service('getObjectNotifications', function($rootScope) {
    return function(table_name, on_new_socket, on_changed, on_deleted) {
        $rootScope.$on('warehaus.models.new_socket_available', function(event, socket) {
            socket.on('object_changed:' + table_name, on_changed);
            socket.on('object_deleted:' + table_name, on_deleted);
            on_new_socket();
        });
    };
});
