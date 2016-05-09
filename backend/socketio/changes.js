'use strict';
var logger = require('../logger');
var db = require('../db');
var r = require('rethinkdbdash')(db.config());
var msg = require('./messages');

const USERS_ROOM = 'users';

const noFilter = x => x;

const sendNotification = (tableConfig, io, err, change) => {
    logger.debug(`Received notification: dbTable=${tableConfig.dbTable} err=${err} ` +
                 `change.old_val.id=${change.old_val ? change.old_val.id : 'null'} ` +
                 `change.new_val.id=${change.new_val ? change.new_val.id : 'null'}:`);
    if (err) {
        return;
    }
    const objectFilter = tableConfig.objectFilter || noFilter;
    if (change.new_val === null) {
        msg.msgObjectDeleted(io.to(USERS_ROOM), tableConfig.dbTable, objectFilter(change.old_val));
    } else {
        msg.msgObjectChanged(io.to(USERS_ROOM), tableConfig.dbTable, objectFilter(change.new_val));
    }
};

const listenForChanges = (tablesConfig) => {
    return (ctx) => {
        tablesConfig.forEach(tableConfig => {
            r.table(tableConfig.dbTable).changes().run(function(err, cursor) {
                if (err) {
                    logger.error(`error: While waiting for changes on ${tableConfig.dbTable}: ${err}`);
                    process.exit(1);
                }
                cursor.each((err, change) => {
                    sendNotification(tableConfig, ctx.io, err, change);
                });
            });
        });
    };
};

module.exports = {
    USERS_ROOM,
    listenForChanges
};
