#!/usr/bin/env node

var logger = require('./logger');
var db     = require('./db');

var r        = require('rethinkdb');
var schedule = require('node-schedule');

const HEARTBEAT_INTERVAL = 30; // seconds

var mark_offline_servers = function() {
    logger.info('Start offline servers check');
    r.table('object').between(0, r.now().sub(HEARTBEAT_INTERVAL * 2), { index: 'last_seen' }).update({ status: 'offline' }).run(db.conn, (err, result) => {
        if (err) {
            logger.error('Error updating offline servers');
            logger.error(err);
        } else {
            logger.debug('Updated offline servers:', result);
        }
    });
};

db.connect().then(() => {
    mark_offline_servers();
    schedule.scheduleJob('*/1 * * * *', mark_offline_servers);
}).catch(err => {
    logger.error(err);
    process.exit(1);
});
