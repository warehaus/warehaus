'use strict';

const msgObjectChanged = (socket, tableName, obj) => {
    socket.emit(`object_changed:${tableName}`, { object: obj });
};

const msgObjectDeleted = (socket, tableName, obj) => {
    socket.emit(`object_deleted:${tableName}`, { id: obj.id });
};

module.exports = {
    msgObjectChanged,
    msgObjectDeleted
};
