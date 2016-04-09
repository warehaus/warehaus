var jsData = require('js-data');
var dsRethinkDBAdapter = require('js-data-rethinkdb');
var db = require('./db');

var adapter = new dsRethinkDBAdapter(db.config());
var store = new jsData.DS();

store.registerAdapter('rethinkdb', adapter, { default: true });

var User = store.defineResource('user');
var GoogleUser = store.defineResource('user_google');
var Settings = store.defineResource('settings');

module.exports = {
    store: store,
    User: User,
    GoogleUser: GoogleUser,
    Settings: Settings
};
