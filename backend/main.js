import commandLineArgs   from 'command-line-args'
import logger            from './logger'
import startServer       from './server'
import { initModels }    from './models'
import { configureAuth } from './auth'

function printLogo() {
    // Made with http://patorjk.com/software/taag/#p=display&f=Ogre&t=warehaus
    logger.info("+------------------------------------------------+")
    logger.info("|                         _                      |")
    logger.info("| __      ____ _ _ __ ___| |__   __ _ _   _ ___  |")
    logger.info("| \\ \\ /\\ / / _` | '__/ _ \\ '_ \\ / _` | | | / __| |")
    logger.info("|  \\ V  V / (_| | | |  __/ | | | (_| | |_| \\__ \\ |")
    logger.info("|   \\_/\\_/ \\__,_|_|  \\___|_| |_|\\__,_|\\__,_|___/ |")
    logger.info("|                                                |")
    logger.info("+------------------------------------------------+")
}

function errorHandler(err) {
    logger.error(err)
    process.exit(1)
}

function main() {
    printLogo()
    const args = commandLineArgs([
        { name: 'http_port' , type: String, defaultValue: process.env.WAREHAUS_HTTP_PORT || 8000 },
        { name: 'neo4j_host', type: String, defaultValue: process.env.NEO4J_PORT_7687_TCP_ADDR || 'localhost' },
        { name: 'neo4j_port', type: Number, defaultValue: process.env.NEO4J_PORT_7687_TCP_PORT || '7687' },
        { name: 'neo4j_user', type: String, defaultValue: process.env.NEO4J_USERNAME || 'neo4j' },
        { name: 'neo4j_pass', type: String, defaultValue: process.env.NEO4J_PASSWORD || 'neo4j' }
    ])
    const db_settings = {
        host: args.neo4j_host,
        port: args.neo4j_port,
        user: args.neo4j_user,
        pass: args.neo4j_pass
    }
    initModels(db_settings)
        .then(configureAuth)
        .then(() => { return startServer(args.http_port) })
        .catch(errorHandler)
}

main()
