import { connectToDb } from './db/connection'
import Settings        from './settings'
import User            from './users'
import Event           from './events'

export { Settings, User, Event }

export function initModels(db_settings) {
    return connectToDb(db_settings)
        .then(Settings.initModel)
        .then(User.initModel)
        .then(Event.initModel)
}
