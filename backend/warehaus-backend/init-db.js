#!/usr/bin/env node

var logger = require('./logger');
var db = require('./db');

var r = require('rethinkdb');
require('rethinkdb-init')(r);

const settings_table = {
    name: 'settings'
};

const users_table = {
    name: 'user',
    indexes: [
        'username',
        {
            name: 'api_tokens',
            multi: true
        }
    ]
};

const google_users_table = {
    name: 'user_google'
};

const objects_table = {
    name: 'object',
    indexes: [
        'slug',
        'type_id',
        'parent_id',
        {
            name: 'slug_parent',
            indexFunction: [r.row('slug'), r.row('parent_id')]
        },
        {
            name: 'slug_type',
            indexFunction: [r.row('slug'), r.row('type_id')]
        },
        {
            name: 'slug_type_parent',
            indexFunction: [r.row('slug'), r.row('type_id'), r.row('parent_id')]
        },
        {
            name: 'parent_type',
            indexFunction: [r.row('parent_id'), r.row('type_id')]
        }
    ]
};

r.init(db.config(), [
    settings_table,
    users_table,
    google_users_table,
    objects_table
]).then(conn => {
    conn.close();
}).catch(err => {
    logger.error(err);
    process.exit(1);
});
