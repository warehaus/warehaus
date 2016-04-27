var jsData = require('js-data');
var dsRethinkDBAdapter = require('js-data-rethinkdb');
var db = require('./db');

var adapter = new dsRethinkDBAdapter(db.config());
var store = new jsData.DS();

store.registerAdapter('rethinkdb', adapter, { default: true });

var User = store.defineResource('user');
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

module.exports = {
    store: store,
    User: User,
    isUsernameTaken: isUsernameTaken,
    GoogleUser: GoogleUser,
    Settings: Settings,
    Event: Event
};
