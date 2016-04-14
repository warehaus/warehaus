#!/usr/bin/env node

var http_server = require('http').createServer();
var io = require('socket.io')(http_server);
var r = require('rethinkdb');
var logger = require('./logger');
var db = require('./db');

const HTTP_PORT = process.env.HTTP_PORT || 5001;

var notify_id_only = function(object) {
    return {id: object.id};
};

var notify_entire_object = function(object) {
    return {object: object};
};

const TABLES_CONFIGURATION = [
    {
        db_table: 'object',
        notify_update_method: notify_entire_object,
        notify_delete_method: notify_id_only
    },
    {
        db_table: 'user',
        notify_update_method: notify_id_only,
        notify_delete_method: notify_id_only
    },
    {
        db_table: 'event',
        notify_update_method: notify_entire_object,
        notify_delete_method: notify_id_only
    }
];

var send_notification = function(table_config, err, change) {
    logger.debug(`Received notification: db_table=${table_config.db_table} err=${err} change.old_val.id=${change.old_val ? change.old_val.id : 'null'} change.new_val.id=${change.new_val ? change.new_val.id : 'null'}:`);
    if (err) {
        return;
    }
    if (change.new_val === null) {
        io.emit(`object_deleted:${table_config.db_table}`, table_config.notify_delete_method(change.old_val));
    } else {
        io.emit(`object_changed:${table_config.db_table}`, table_config.notify_update_method(change.new_val));
    }
};

var start_server = function() {
    http_server.listen(HTTP_PORT);
    logger.info(`Notification server listening on :${HTTP_PORT}`);
};

var listen_for_changes = function() {
    TABLES_CONFIGURATION.forEach(table_config => {
        r.table(table_config.db_table).changes().run(db.conn, function(err, cursor) {
            if (err) {
                console.log(`error: While waiting for changes on ${table_config.db_table}: ${err}`);
                process.exit(1);
            }
            cursor.each((err, change) => {
                send_notification(table_config, err, change);
            });
        });
    });
};

var error_handler = function(err) {
    logger.error(err);
    process.exit(1);
};

db.connect().then(start_server).then(listen_for_changes).catch(error_handler);
