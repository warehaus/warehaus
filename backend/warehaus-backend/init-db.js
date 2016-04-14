#!/usr/bin/env node

var logger = require('./logger');
var db = require('./db');

var r = require('rethinkdb');
require('rethinkdb-init')(r);

const globalIndexes = [
    'created_at',
    'modified_at'
];

const settings_table = {
    name: 'settings',
    indexes: globalIndexes
};

const users_table = {
    name: 'user',
    indexes: globalIndexes.concat([
        'username',
        {
            name: 'api_tokens',
            multi: true
        }
    ])
};

const google_users_table = {
    name: 'user_google',
    indexes: globalIndexes
};

const objects_table = {
    name: 'object',
    indexes: globalIndexes.concat([
        'slug',
        'type_id',
        'parent_id',
        'last_seen',
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
    ])
};

const events_table = {
    name: 'event',
    indexes: globalIndexes.concat([
        'obj_id',
        'user_id',
        {
            name: 'interested_ids',
            multi: true
        }
    ])
};

r.init(db.config(), [
    settings_table,
    users_table,
    google_users_table,
    objects_table,
    events_table
]).then(conn => {
    conn.close();
}).catch(err => {
    logger.error(err);
    process.exit(1);
});
