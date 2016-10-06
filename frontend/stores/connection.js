import { getLogger } from 'loglevel'
import { v4 as uuid } from 'uuid'

/* global setTimeout */
/* global WebSocket */

const logger = getLogger('connection')

//------------------------------------------------
// Actions
//------------------------------------------------

export const connectionActions = {
    CONNECT        : 'warehaus/CONNECT',
    DISCONNECT     : 'warehaus/DISCONNECT',
    CONNECTION_ON  : 'warehaus/CONNECTION_ON',
    CONNECTION_OFF : 'warehaus/CONNECTION_OFF'
}

export function connect() {
    return { type: connectionActions.CONNECT }
}

export function disconnect() {
    return { type: connectionActions.DISCONNECT }
}

export function connectionOn({ socket, msg_handler }) {
    return { type: connectionActions.CONNECTION_ON, socket, msg_handler }
}

export function connectionOff() {
    return { type: connectionActions.CONNECTION_OFF }
}

//------------------------------------------------
// Reducer
//------------------------------------------------

export const connectionStatus = {
    CONNECTING    : 'CONNECTING',
    CONNECTED     : 'CONNECTED',
    DISCONNECTING : 'DISCONNECTING',
    DISCONNECTED  : 'DISCONNECTED'
}

const initialState = {
    socket         : null,
    msg_handler    : null,
    status         : connectionStatus.DISCONNECTED,
    auto_reconnect : false
}

export function reducer(state = initialState, action) {
    switch (action.type) {
    case connectionActions.CONNECT:
        return {
            ...state,
            status: connectionStatus.CONNECTING,
            auto_reconnect: true
        }
    case connectionActions.DISCONNECT:
        return {
            ...state,
            status: connectionStatus.DISCONNECTING,
            auto_reconnect: false
        }
    case connectionActions.CONNECTION_ON:
        return {
            ...state,
            socket: action.socket,
            msg_handler: action.msg_handler,
            status: connectionStatus.CONNECTED
        }
    case connectionActions.CONNECTION_OFF:
        return {
            ...state,
            socket: null,
            msg_handler: null,
            status: connectionStatus.DISCONNECTED
        }
    default:
        return state
    }
}

//------------------------------------------------
// Middleware
//------------------------------------------------

class MessageHandler {
    constructor(socket) {
        this.socket = socket
        this.ongoing = new Map()
    }

    sendMsg(msg) {
        msg.id = uuid()
        return new Promise((resolve, reject) => {
            logger.debug(`Sending`, msg)
            this.socket.send(msg)
            this.ongoing.set(msg.id, { resolve, reject })
        })
    }

    handleMsg(msg) {
        if (msg.type === 'reply') {
            if (!msg.id) {
                logger.error(`Can't handle reply without 'id' field:`, msg)
            } else if (this.ongoing.has(msg.id)) {
                logger.debug(`Received`, msg)
                const { resolve } = this.ongoing.get(msg.id)
                this.ongoing.delete(msg.id)
                resolve(msg)
            } else {
                logger.error(`Received reply for unknown 'id':`, msg)
            }
        } else {
            logger.error(`Unknown 'type' in message:`, msg)
        }
    }

    close() {
        for (const [ id, [, reject] ] of this.ongoing) {
            logger.debug(`Rejecting [${id}] due to disconnection`)
            reject('disconnected')
        }
    }
}

function socketUrl(location) {
    const protocol = (location.protocol === 'https:') ? 'wss:' : 'ws:'
    return `${protocol}//${location.host}/socketo`
}

function createConnection(dispatch) {
    const url = socketUrl(window.location)

    logger.debug(`Trying to connect to ${url}`)
    const socket = new WebSocket(url)
    const msg_handler = new MessageHandler(socket)
    
    socket.onopen = () => {
        logger.info(`Connected to ${url}`)
        dispatch(connectionOn({ socket, msg_handler }))
    } 

    socket.onmessage = msg_event => {
        try {
            const msg = JSON.parse(msg_event.data)
            msg_handler.handleMsg(msg)
        } catch (err) {
            logger.error(`Can't parse message:`, msg_event)
            socket.close()
        }
    }

    socket.onerror = err_event => {
        logger.warn(`Connection error:`, err_event)
        socket.close()
    }

    socket.onclose = close_event => {
        logger.info(`Disconnected from ${url} (code ${close_event.code})`)
        msg_handler.close()
        dispatch(connectionOff())
    }
}

const RECONNECT_TIMEOUT_MS = 5000

export function createMiddleware(reconnect_timeout_ms = RECONNECT_TIMEOUT_MS) {
    return store => next => action => {
        const createConnectionFunc = () => createConnection(store.dispatch)
        const { socket, auto_reconnect } = store.getState().connection
        switch (action.type) {
        case connectionActions.CONNECT:
            setTimeout(createConnectionFunc, 0)
            break
        case connectionActions.DISCONNECT:
            if (socket) {
                setTimeout(socket.close, 0)
            } else {
                setTimeout(() => store.dispatch(connectionOff()), 0)
            }
            break
        case connectionActions.CONNECTION_OFF:
            if (auto_reconnect) {
                setTimeout(createConnectionFunc, reconnect_timeout_ms)
            }
            break
        }
        return next(action)
    }
}
