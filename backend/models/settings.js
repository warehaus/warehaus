import { queryDb, returnOne } from './db/connection'
import logger from '../logger'

export default class Settings {
    static initModel() {
        return queryDb(`CREATE CONSTRAINT ON (settings:Settings) ASSERT settings.name IS UNIQUE`)
    }

    constructor(name, createNew) {
        this.name = name
        this.createNew = createNew
    }

    get() {
        return queryDb(`MATCH (settings:Settings { name: {name} }) RETURN settings`, { name: this.name })
            .then(returnOne)
            .then(record => {
                if (record) {
                    logger.debug(`Fetched ${this.name} settings`)
                    return record
                }
                return this.create()
            })
            .then(settings => settings.properties)
    }

    create() {
        logger.debug(`Creating new ${this.name} settings`)
        return this.createNew()
            .then(props => queryDb(`CREATE (settings:Settings)
                                    SET settings = { props }, settings.name = {name}, settings.created = timestamp()
                                    RETURN settings`, { name: this.name, props }))
            .then(returnOne)
    }

    update() {
        logger.debug(`Updating ${this.name} settings`)
        // xxx
        return Promise.resolve()
    }

    delete() {
        logger.debug(`Deleting ${this.name} settings`)
        return queryDb(`MATCH (settings:Settings { name: {name} } DELETE settings`, { name: this.name })
    }
}
