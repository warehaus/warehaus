import path       from 'path'
import express    from 'express'
import bodyParser from 'body-parser'
import expressWs  from 'express-ws'
import morgan     from 'morgan'
import passport   from 'passport'
import logger     from './logger'

import { authRoutes, authMessages }  from './auth'
import { Connection, MessageRouter } from './connection'

export default function startServer(port) {
    const STATIC_PATH = path.join(__dirname, 'static')
    const app = express()
    expressWs(app)

    app.use(morgan('common'))
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(bodyParser.json())
    app.disable('etag')
    app.use(passport.initialize())

    app.use('/static', express.static(STATIC_PATH))
    app.use('/api/auth', authRoutes())

    const msg_router = new MessageRouter([].concat(
        authMessages()
    ))

    app.ws('/socketo', (ws, req) => {
        try {
            const conn = new Connection(ws, req, msg_router)
            ws.on('message', raw_msg => msg_router.dispatch(conn, raw_msg))
            ws.on('close', conn.close.bind(conn))
        } catch (err) {
            logger.error(err)
        }
    })

    app.get('*', (req, res) => {
        res.sendFile('index.html', { root: STATIC_PATH })
    })

    app.listen(port)
    logger.info(`Server listening on :${port}`)
}
