import express       from 'express'
import passport      from 'passport'
import JwtBackend    from './jwt'
import LocalBackend  from './local'
import TokenBackend  from './token'
import GoogleBackend from './google'
import { User }      from '../models'

passport.serializeUser(function(user, done) {
    done(null, user.id)
})

passport.deserializeUser(function(id, done) {
    User.find(id)
        .then(user => done(null, user))
        .catch(done)
})

const BACKENDS = [
    JwtBackend,
    LocalBackend,
    TokenBackend,
    GoogleBackend,
]

let backends = null

export function configureAuth() {
    return Promise.all(BACKENDS.map(cls => {
        const backend = new cls()
        return backend.configure().then(() => {
            return [ backend.name, backend ]
        })
    })).then(results => {
        backends = new Map(results)
    })
}

export function authRoutes() {
    const router = express.Router()

    router.get('/', (req, res) => {
        const login_methods = {}
        for (const [backend_name, backend] of backends) {
            if (backend.canLogin()) {
                login_methods[backend_name] = true
            }
        }
        res.json(login_methods)
    })

    for (const [backend_name, backend] of backends) {
        if (backend.router) {
            router.use(`/${backend_name}`, backend.router(backends))
        }
    }

    return router
}

export function authMessages() {
    let messages = []
    for (const backend of backends.values()) {
        if (backend.messages) {
            messages = messages.concat(backend.messages())
        }
    }
    return messages
}
