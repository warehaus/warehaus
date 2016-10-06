import winston from 'winston'
import path from 'path'

export default new (winston.Logger)({
    level: 'debug',
    transports: [
        new winston.transports.Console({
            prettyPrint: true,
            colorize: true,
            timestamp: true
        }),
        new winston.transports.File({
            filename: path.join(process.env.WAREHAUS_LOGS_DIR || '/tmp', 'warehaus.log'),
            prettyPrint: true,
            colorize: true,
            timestamp: true,
            json: false,
            maxsize: Math.pow(2, 20),
            maxFiles: 10
        })
    ]
})
