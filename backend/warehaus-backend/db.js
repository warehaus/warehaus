var r = require('rethinkdb');

var connect_to_db = function(success_func) {
    r.connect({
        host: process.env.RETHINKDB_PORT_28015_TCP_ADDR,
        port: process.env.RETHINKDB_PORT_28015_TCP_PORT,
        db: process.env.RETHINKDB_DB || 'warehaus',
        authKey: process.env.RETHINKDB_AUTH,
    }).then(success_func).error(err => {
        console.log('error: Could not connect to database: ' + err);
        process.exit(1);
    });
};

module.exports = {
    connect_to_db: connect_to_db
};
