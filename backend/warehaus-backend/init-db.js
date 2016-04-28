#!/usr/bin/env node

var logger = require('./logger');
var db = require('./db');
var r = require('rethinkdb');

const globalIndexes = [
    'created_at',
    'modified_at'
];

//--------------------------------------
// Settings
//--------------------------------------

const settings_table = {
    name: 'settings',
    indexes: globalIndexes
};

const SETTINGS_ID = 1
const DEFAULT_KEY_LENGTH = 48;

var make_key = function(len) {
    var result = '';
    const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~ ';
    for (var i = 0; i < len; ++i) {
        result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return result;
};

var create_settings = function(conn) {
    var new_settings = {
        id            : SETTINGS_ID,
        created_at    : r.now(),
        modified_at   : r.now(),
        jwt_secret    : make_key(DEFAULT_KEY_LENGTH),
        password_salt : make_key(DEFAULT_KEY_LENGTH),
    };
    return new Promise(function(resolve, reject) {
        r.table('settings').insert(new_settings).run(conn, function(err, settings_doc) {
            if (err) {
                reject(err);
            } else {
                resolve(conn);
            }
        });
    });
};

var ensure_settings = function(conn) {
    return new Promise(function(resolve, reject) {
        r.table('settings').get(SETTINGS_ID).run(conn, function(err, settings_doc) {
            if (err) {
                reject(err);
            } else if (settings_doc) {
                resolve(conn);
            } else {
                resolve(create_settings(conn));
            }
        });
    });
};

//--------------------------------------
// Users
//--------------------------------------

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

const user_api_tokens_table = {
    name: 'user_api_token',
    indexes: globalIndexes.concat([
        'user_id'
    ])
};

const google_users_table = {
    name: 'user_google',
    indexes: globalIndexes
};

//--------------------------------------
// Objects
//--------------------------------------

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

//--------------------------------------
// Events
//--------------------------------------

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

require('rethinkdb-init')(r);

r.init(db.config(), [
    settings_table,
    users_table,
    user_api_tokens_table,
    google_users_table,
    objects_table,
    events_table
]).then(ensure_settings).then(conn => {
    conn.close();
}).catch(err => {
    logger.error(err);
    process.exit(1);
});
