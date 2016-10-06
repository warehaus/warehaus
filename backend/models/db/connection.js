import { v1 as neo4j } from 'neo4j-driver'
import logger from '../../logger'

var db_driver = null

export function connectToDb({ host, port, user, pass }) {
    return new Promise((resolve) => {
        const server = `bolt://${host}:${port}`
        logger.debug(`Connecting to database at ${server}`)
        db_driver = neo4j.driver(server, neo4j.auth.basic(user, pass))
        resolve()
    })
}

export function queryDb(...query) {
    return new Promise((resolve, reject) => {
        const session = db_driver.session()
        session.run(...query)
            .then(result => {
                result.summary.notifications.forEach(logger.warn)
                resolve(result.records.map(x => x))
                session.close()
            })
            .catch(err => {
                logger.error(`Error executing query`, query, err)
                reject(err)
                session.close()
            })
    })
}

export function returnOne(records) {
    if (records.length === 0) {
        return null
    }
    if (records.length === 1) {
        const record = records[0]
        return record.get(0)
    }
    throw new Error(`Expected a single result`)
}

export function returnOneOf(cls) {
    return records => {
        const node = returnOne(records)
        if (node) {
            return new cls(node)
        }
        return null
    }
}
