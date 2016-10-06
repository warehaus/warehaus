import * as auth       from './auth'
import * as connection from './connection'

export const reducers = {
    auth: auth.reducer,
    connection: connection.reducer
}

export const middlewares = [
    auth.createMiddleware(),
    connection.createMiddleware()
]
