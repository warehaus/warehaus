import express                        from 'express'
import passport                       from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { AllRoles }                   from './roles'
import logger                         from '../logger'
import { Settings, User }             from '../models'
import { Message }                    from '../connection'

export default class GoogleBackend {
    constructor() {
        this.name = 'google'
        this.stored_settings = new Settings(this.name, () => Promise.resolve({}))
    }

    configure() {
        return this.stored_settings.get().then(settings => {
            this.settings = settings
            this.configureStrategy()
        })
    }

    configureStrategy() {
        passport.unuse('google')
        if (this.canLogin()) {
            logger.info('Configuring Google login')
            passport.use('google', new GoogleStrategy({
                clientID: this.settings.client_id,
                clientSecret: this.settings.client_secret,
                callbackURL: this.settings.redirect_uri
            }, this.authCallback.bind(this)))
        }
    }

    canLogin() {
        return (this.settings &&
                this.settings.client_id &&
                this.settings.client_secret &&
                this.settings.redirect_uri)
    }

    authCallback(accessToken, refreshToken, profile, done) {
        const chooseUsername = () => {
            // Try to extract the username from the Google email. If it's
            // available, create the local user with that name. Otherwise
            // use the Google ID
            const possible_username = profile.emails[0].value.split('@')[0]
            return User.isUsernameTaken(possible_username).then(is_taken => {
                return is_taken ? profile.id : possible_username
            })
        }

        const createNewUser = username => {
            logger.debug(`Creating new local user for Google user ${profile.id}`)
            return User.create({
                username,
                display_name: profile.displayName,
                email: profile.emails[0].value,
                role: AllRoles.user
            })
        }

        const setCredentials = user => {
            return user.setCredentials({ backend: this.name, props: profile, replace: true }).then(() => user)
        }

        logger.debug(`Looking for Google user with profile.id=${profile.id}`)
        return User.findByCredentials({ backend: this.name, id: profile.id })
            .then(user => {
                if (user) {
                    return user
                }
                return chooseUsername()
                    .then(createNewUser)
                    .then(setCredentials)
                    .then(user => done(null, user))
                    .catch(done)
            })
            .catch(done)
    }

    router(backends) {
        const self = this
        const jwt_backend = backends.get('jwt')
        const router = express.Router()

        router.get('/login', function(req, res, next) {
            const options = { scope: ['profile', 'email'] }
            if (self.settings.hosted_domain) {
                options.hd = self.settings.hosted_domain
            }
            return passport.authenticate('google', options)(res, res, next)
        })

        router.get('/callback', function(req, res, next) {
            passport.authenticate('google', jwt_backend.makeJwtForAuthenticatedUser(req, res, next))(req, res, next)
        })

        return router
    }

    messages() {
        return [
            new Message('get_google_settings', {
                handler: this.handleGetSettings.bind(this),
                minRole: AllRoles.admin
            }),
            new Message('set_google_settings', {
                handler: this.handleSetSettings.bind(this),
                minRole: AllRoles.admin
            }),
        ]
    }

    handleGetSettings() {
        return this.stored_settings.get()
    }

    handleSetSettings(conn, msg) {
        return this.stored_settings.update({
            client_id     : msg.settings.client_id,
            client_secret : msg.settings.client_secret,
            redirect_uri  : msg.settings.redirect_uri,
            hosted_domain : msg.settings.hosted_domain
        }).then(this.configure.bind(this))
    }
}
