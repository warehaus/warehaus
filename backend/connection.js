import uuid from 'uuid'
import logger from './logger'
import { AllRoles } from './auth/roles'

function newUid() {
    const buffer = Buffer.allocUnsafe(16)
    uuid.v4(null, buffer, 0)
    return buffer.toString('base64')
}

export class Message {
    constructor(msg_id, { handler, minRole } = { minRole: AllRoles.user }) {
        this.msg_id = msg_id
        this.handler = handler
        this.minRole = minRole
    }
}

export class MessageRouter {
    constructor(messages) {
        this.msg_map = new Map(messages.map(message => [ message.msg_id, message ]))
    }

    dispatch(conn, raw_msg) {
        logger.debug(`[Conn ${conn.id}] -> ${raw_msg}`)
        return Promise.resolve()
            .then(() => this.parseJson(raw_msg))
            .then(msg => this.verifyType(msg))
            .then(msg => this.verifyPermissions(msg))
            .then(msg => this.handle(conn, msg))
            .then(reply => conn.send(reply))
            .catch(err => conn.send({ type: 'error', message: err }))
    }

    parseJson(raw_msg) {
        try {
            return Promise.resolve(JSON.parse(raw_msg))
        } catch (SyntaxError) {
            return Promise.reject('Messages should be in JSON format')
        }
    }

    verifyType(msg) {
        if (!msg.type) {
            return Promise.reject('Message missing a `type` field')
        }
        if (typeof(msg.type) !== 'string') {
            return Promise.reject('Message `type` field has to be a string')
        }
        if (!this.msg_map.has(msg.type)) {
            return Promise.reject(`Unknown message type '${msg.type}'`)
        }
        return Promise.resolve(msg)
    }

    verifyPermissions(msg) {
        //const descriptor = this.msg_map.get(msg.type)
        // xxx verify permissions
        return Promise.resolve(msg)
    }

    handle(conn, msg) {
        const descriptor = this.msg_map.get(msg.type)
        const reply = descriptor.handler(conn, msg)
        if (msg.id) {
            reply.id = msg.id
        }
        return reply
    }
}

export class Connection {
    constructor(socket, req, msg_router) {
        this.id = newUid()
        this.socket = socket
        this.msg_router = msg_router
        this.authenticated = false
        logger.debug(`[Conn ${this.id}] Client connected (${req.headers['x-forwarded-for'] || req.connection.remoteAddress})`)
    }

    close() {
        logger.debug(`[Conn ${this.id}] Connection closed`)
        this.socket = null
    }

    send(msg) {
        if (!this.socket) {
            logger.warn(`[Conn ${this.id}] Socket closed while handling message`)
            return
        }
        const raw_msg = JSON.stringify(msg)
        this.socket.send(raw_msg, (error) => {
            if (error) {
                logger.error(`[Conn ${this.id}] Error sending reply: ${error}`)
            } else {
                logger.debug(`[Conn ${this.id}] <- ${raw_msg}`)
            }
        })
    }
}
