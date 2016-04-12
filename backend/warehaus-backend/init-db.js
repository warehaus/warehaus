#!/usr/bin/env node

var logger = require('./logger');
var db = require('./db');

var r = require('rethinkdb');
require('rethinkdb-init')(r);

r.init(db.config(), [
    {
        name: 'settings'
    },
    {
        name: 'user',
        indexes: [
            'username',
            {
                name: 'api_tokens',
                multi: true
            }
        ]
    },
    {
        name: 'user_google'
    },
    {
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
    }
]).then(conn => {
    conn.close();
}).catch(err => {
    logger.error(err);
    process.exit(1);
});
