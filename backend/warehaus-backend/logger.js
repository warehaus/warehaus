var winston = require('winston');
var logger = new (winston.Logger)({
    level: 'debug',
    transports: [
        new (winston.transports.Console)({
            prettyPrint: true,
            colorize: true,
            timestamp: true,
        }),
    ],
});

module.exports = logger;
