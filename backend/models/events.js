import { queryDb, returnOne } from './db/connection'

export default class Event {
    static initModel() {
        return queryDb(`CREATE INDEX ON :Event(created)`)
    }

    static create({ title, content }) {
        const props = { title, content }
        return queryDb(`CREATE (event:Event)
                        SET event = { props }, event.created = timestamp()
                        RETURN event`, { props }).then(returnOne)
    }
}
