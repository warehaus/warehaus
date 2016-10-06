import crypto                        from 'crypto'
import passport                      from 'passport'
import { Strategy as TokenStrategy } from 'passport-accesstoken'
import { User }                      from '../models'
import { Message }                   from '../connection'

const API_TOKEN_LENGTH = 20

export default class TokenBackend {
    constructor() {
        this.name = 'token'
    }

    configure() {
        passport.use('token', new TokenStrategy({
            tokenHeader: 'authentication-token',
            tokenField: 'token'
        }, this.login.bind(this)))
        return Promise.resolve()
    }

    canLogin() {
        return false
    }

    login(token, done) {
        User.findByCredentials({ backend: this.name, id: token })
            .then(user => {
                done(null, user)
            })
            .catch(done)
    }

    messages() {
        return [
            new Message('get_auth_tokens'   , { handler: this.handleGetTokens.bind(this) }),
            new Message('create_auth_token' , { handler: this.handleAddToken.bind(this) }),
            new Message('delete_auth_token' , { handler: this.handleDeleteToken.bind(this) }),
        ]
    }

    handleGetTokens(conn, msg) {
        return User.find(msg.uid).then(user => {
            if (!user) {
                return Promise.reject('No such user')
            }
            return user.getCredentials({ backend: this.name })
        })
    }

    generateToken() {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(API_TOKEN_LENGTH, (bytes_err, buffer) => {
                if (bytes_err) {
                    reject(bytes_err)
                } else {
                    resolve(buffer.toString('hex'))
                }
            })
        })
    }

    handleAddToken(conn, msg) {
        Promise.all([ User.find(msg.uid), this.generateToken() ])
            .then(([ user, token ]) => user.addCredentials({ backend: 'token', props: { id: token } }))
    }

    handleDeleteToken(conn, msg) {
        User.find(msg.uid)
            .then(user => user.removeCredentials({ backend: 'token', id: msg.api_token }))
    }
}
