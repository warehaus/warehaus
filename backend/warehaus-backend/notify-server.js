#!/usr/bin/env node

var http_server = require('http').createServer();
var io = require('socket.io')(http_server);
var r = require('rethinkdb');
var logger = require('./logger');
var db = require('./db');

const HTTP_PORT = process.env.HTTP_PORT || 5001;
const DB_TABLES = ['object', 'user', 'event'];

var send_notification = function(db_table, err, change) {
    logger.debug(`Received notification: db_table=${db_table} err=${err} change.old_val.id=${change.old_val ? change.old_val.id : 'null'} change.new_val.id=${change.new_val ? change.new_val.id : 'null'}:`);
    if (err) {
        return;
    }
    if (change.new_val === null) {
        io.emit(`object_deleted:${db_table}`, {id: change.old_val.id});
    } else {
        io.emit(`object_changed:${db_table}`, {id: change.new_val.id});
    }
};

var start_server = function() {
    http_server.listen(HTTP_PORT);
    logger.info(`Notification server listening on :${HTTP_PORT}`);
};

var listen_for_changes = function() {
    DB_TABLES.forEach(db_table => {
        r.table(db_table).changes().run(db.conn, function(err, cursor) {
            if (err) {
                console.log(`error: While waiting for changes on ${db_table}: ${err}`);
                process.exit(1);
            }
            cursor.each((err, change) => {
                send_notification(db_table, err, change);
            });
        });
    });
};

var error_handler = function(err) {
    logger.error(err);
    process.exit(1);
};

db.connect().then(start_server).then(listen_for_changes).catch(error_handler);
