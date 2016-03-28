#!/usr/bin/env node

var http_server = require('http').createServer();
var io = require('socket.io')(http_server);
var r = require('rethinkdb');
var logger = require('./logger');
var db = require('./db');

const HTTP_PORT = 5001;
const DB_TABLES = ['object', 'user'];

http_server.listen(HTTP_PORT);
logger.info(`Notification server listening on :${HTTP_PORT}`);

var send_notification = function(db_table, err, change) {
    logger.debug(`Received notification: db_table=${db_table} err=${err} change:`, change);
    if (err) {
        return;
    }
    if (change.new_val === null) {
        io.emit(`object_deleted:${db_table}`, {id: change.old_val.id});
    } else {
        io.emit(`object_changed:${db_table}`, {id: change.new_val.id});
    }
};

var listen_for_changes = function(conn) {
    DB_TABLES.forEach(db_table => {
        r.table(db_table).changes().run(conn, function(err, cursor) {
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

db.connect_to_db(listen_for_changes);
