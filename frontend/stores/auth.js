import { connect, disconnect } from './connection'

/* global setTimeout */

//------------------------------------------------
// Actions
//------------------------------------------------

export const authActions = {
    AUTH_ACQUIRED : 'warehaus/AUTH_ACQUIRED',
    AUTH_REVOKED  : 'warehaus/AUTH_REVOKED'
}

export function authAcquired(jwt_token) {
    return { type: authActions.AUTH_ACQUIRED, jwt_token }
}

export function authRevoked() {
    return { type: authActions.AUTH_REVOKED }
}

//------------------------------------------------
// Reducer
//------------------------------------------------

const initialState = {
    identified: false,
    jwt_token: null
}

export function reducer(state = initialState, action) {
    switch (action.type) {
    case authActions.AUTH_ACQUIRED:
        return {
            ...state,
            identified: true,
            jwt_token: action.jwt_token
        }
    case authActions.AUTH_REVOKED:
        return initialState
    default:
        return state
    }
}

//------------------------------------------------
// Middleware
//------------------------------------------------

const STORAGE_KEY = 'jwt-token'

const getJwtToken    = ()          => window.localStorage.getItem(STORAGE_KEY)
const setJwtToken    = (jwt_token) => window.localStorage.setItem(STORAGE_KEY, jwt_token)
const deleteJwtToken = ()          => window.localStorage.removeItem(STORAGE_KEY)

export function createMiddleware() {
    return store => {
        const jwt_token = getJwtToken()
        if (jwt_token) {
            setTimeout(() => store.dispatch(authAcquired(jwt_token)), 0)
        } else {
            setTimeout(() => store.dispatch(authRevoked()), 0)
        }
        return next => action => {
            switch (action.type) {
            case authActions.AUTH_ACQUIRED:
                setJwtToken(action.jwt_token)
                setTimeout(() => store.dispatch(connect()), 0)
                break
            case authActions.AUTH_REVOKED:
                deleteJwtToken()
                setTimeout(() => store.dispatch(disconnect()), 0)
                break
            }
            return next(action)
        }
    }
}
