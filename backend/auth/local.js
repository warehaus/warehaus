 import express                            from 'express'
import passport                           from 'passport'
import LocalStrategy                      from 'passport-local'
import { AllRoles, isRoleAllowedToLogin } from './roles'
import PasswordHasher                     from './password-hasher'
import { generateKey }                    from './key-generator'
import logger                             from '../logger'
import { User, Settings }                 from '../models'

const FIRST_USER_USERNAME = 'admin'
const FIRST_USER_PASSWORD = 'admin'

export default class LocalBackend {
    constructor() {
        this.name = 'local'
        this.stored_settings = new Settings(this.name, () => Promise.resolve({
            password_salt: generateKey()
        }))
    }

    configure() {
        return this.stored_settings.get()
            .then(settings => {
                this.password_hasher = new PasswordHasher(settings.password_salt)
            })
            .then(this.ensureFirstUser.bind(this))
            .then(() => {
                passport.unuse('local')
                passport.use('local', new LocalStrategy(this.login.bind(this)))
            })
    }

    canLogin() {
        return true
    }

    ensureFirstUser() {
        return User.count().then(user_count => {
            if (user_count.equals(0)) {
                logger.warn(`No users found, creating a new user "${FIRST_USER_USERNAME}" with password "${FIRST_USER_PASSWORD}"`)
                return this.createFirstUser()
            }
            logger.debug(`There ${user_count.equals(1) ? 'is' : 'are'} ${user_count} user${user_count.equals(1) ? '' : 's'} in the database`)
            return Promise.resolve()
        })
    }

    createFirstUser() {
        return User.create({ username: FIRST_USER_PASSWORD, role: AllRoles.admin, display_name: 'Admin' })
            .then(user => {
                return this.password_hasher.hashPassword(FIRST_USER_PASSWORD).then(hashed_password => {
                    return user.addCredentials({ backend: this.name, props: { hashed_password } })
                })
            })
    }

    login(username, password, done) {
        const checkPassword = user => {
            user.getCredentials({ backend: this.name, single: true })
                .then(creds => {
                    if (!creds) {
                        done(null, false, { message: "You can't login because your account doesn't have a password, please ask your admin to create a password for you" })
                        return
                    }
                    this.password_hasher.checkPassword(password, creds.hashed_password)
                        .then(function(is_password_ok) {
                            if (is_password_ok) {
                                done(null, user)
                            } else {
                                done(null, false, { message: 'Incorrect username or password' })
                            }
                        })
                        .catch(done)
                })
                .catch(done)
        }

        const checkRole = user => {
            if (isRoleAllowedToLogin(user.role)) {
                return true
            }
            const role_err = `Users with role "${user.role}" are not allowed to login with a password`
            logger.error(role_err)
            done(null, false, { message: role_err })
            return false
        }

        const checkUser = user => {
            if (!user) {
                done(null, false, { message: 'Incorrect username or password' })
                return
            }
            logger.warn('Got user', user)
            if (!checkRole(user)) {
                return
            }
            checkPassword(user)
        }
        return User.findByUsername(username)
            .then(checkUser)
            .catch(done)
    }

    router(backends) {
        const jwt_backend = backends.get('jwt')
        const router = express.Router()

        router.post('/login', function(req, res, next) {
            const success = jwt_backend.makeJwtForAuthenticatedUser(req, res, next)
            passport.authenticate('local', success)(req, res, next)
        })
        return router
    }

    messages() {
        return new Map([
        ])
    }
}
