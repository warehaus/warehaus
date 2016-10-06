import jsonwebtoken                            from 'jsonwebtoken'
import HttpStatus                              from 'http-status-codes'
import passport                                from 'passport'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { generateKey }                         from './key-generator'
import logger                                  from '../logger'
import { User, Settings }                      from '../models'

export default class JwtBackend {
    constructor() {
        this.name = 'jwt'
        this.stored_settings = new Settings(this.name, () => Promise.resolve({
            jwt_secret : generateKey(),
            expiration : '7d'
        }))
    }

    configure() {
        return this.stored_settings.get().then(settings => {
            this.settings = settings
            this.configureStrategy()
        })
    }

    canLogin() {
        return false
    }

    configureStrategy() {
        const opts = {
            jwtFromRequest : ExtractJwt.fromAuthHeader(),
            secretOrKey    : this.settings.jwt_secret
        }

        passport.unuse('jwt')
        passport.use('jwt', new JwtStrategy(opts, function(jwt_payload, done) {
            if (!jwt_payload.sub) {
                return done(null, false, { message: 'JWT token is invalid because it is missing the sub claim' })
            }
            return User.find(jwt_payload.sub).then(function(user) {
                done(null, user)
            }).catch(err => {
                logger.error('Received a valid JWT but could not find the user in the database:')
                logger.error(err)
                done(null, false)
            })
        }))
    }

    makeJwtForAuthenticatedUser(req, res, next) {
        const self = this
        return function(err, user, info) {
            if (err) {
                return next(err)
            }
            if (!user) {
                return res.status(HttpStatus.UNAUTHORIZED).json(info)
            }
            const token = jsonwebtoken.sign({sub: user.uuid}, self.settings.jwt_secret, {
                expiresIn: self.settings.getexpiration,
                notBefore: 0
            })
            return res.json({ access_token: token })
        }
    }
}
