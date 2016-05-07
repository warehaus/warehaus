'use strict';

const notifyObjectChanged = (socket, tableName, obj) => {
    socket.emit(`object_changed:${tableName}`, { object: obj });
};

const notifyObjectDeleted = (socket, tableName, obj) => {
    socket.emit(`object_deleted:${tableName}`, { id: obj.id });
};

module.exports = {
    notifyObjectChanged,
    notifyObjectDeleted
};
