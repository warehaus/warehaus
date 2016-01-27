#!/usr/bin/env node

var winston = require('winston');
var logger = new (winston.Logger)({
    level: 'debug',
    transports: [
        new (winston.transports.Console)({
            prettyPrint: true,
            colorize: true,
            timestamp: true,
        }),
    ],
});

var http_server = require('http').createServer();
var io = require('socket.io')(http_server);
var r = require('rethinkdb');

http_server.listen(5001);
logger.info('Notification server listening on :5001');

const db_tables = ['object', 'user'];

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
    db_tables.forEach(db_table => {
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

var connect_to_db = function(success_func) {
    r.connect({
        host: process.env.RETHINKDB_PORT_28015_TCP_ADDR,
        port: process.env.RETHINKDB_PORT_28015_TCP_PORT,
        db: process.env.RETHINKDB_DB || 'labsome',
        authKey: process.env.RETHINKDB_AUTH,
    }).then(success_func).error(err => {
        console.log('error: Could not connect to database: ' + err);
        process.exit(1);
    });
};

connect_to_db(listen_for_changes);
