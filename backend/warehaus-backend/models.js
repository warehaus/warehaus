var jsData = require('js-data');
var dsRethinkDBAdapter = require('js-data-rethinkdb');
var db = require('./db');

var adapter = new dsRethinkDBAdapter(db.config());
var store = new jsData.DS();

store.registerAdapter('rethinkdb', adapter, { default: true });

var User = store.defineResource('user');
var UserApiToken = store.defineResource('user_api_token');
var GoogleUser = store.defineResource('user_google');
var Settings = store.defineResource('settings');
var Event = store.defineResource('event');

var isUsernameTaken = function(username) {
    if (!username) {
        return Promise.resolve(true);
    }
    return User.findAll({
        where: { username: { '===': username } }
    }).then(users => {
        return (users.length > 0);
    });
};

const SETTINGS_ID = 1

var getSettings = function() {
    return Settings.find(SETTINGS_ID);
};

module.exports = {
    store: store,
    User: User,
    isUsernameTaken: isUsernameTaken,
    UserApiToken: UserApiToken,
    GoogleUser: GoogleUser,
    Settings: Settings,
    getSettings: getSettings,
    Event: Event
};
