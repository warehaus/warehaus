import passport   from 'passport' 
import HttpStatus from 'http-status-codes'

export const AllRoles = {
    admin   : 'admin',
    user    : 'user',
    bot     : 'bot',
    deleted : 'deleted'
}

export const isRoleValid = (role) => {
    return Object.keys(AllRoles).indexOf(role) !== -1
}

export const isRoleAllowedToLogin = (role) => {
    return (role === AllRoles.admin) || (role === AllRoles.user)
}

export const roleRequired = (allowed_roles) => {
    return (req, res, next) => {
        passport.authenticate(['jwt', 'token'], (auth_err, user) => {
            if (auth_err) {
                return next(auth_err)
            }
            if (!user) {
                return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' })
            }
            return req.logIn(user, function(login_err) {
                if (login_err) {
                    return next(login_err)
                }
                if (allowed_roles.indexOf(user.role) === -1) {
                    return res.status(HttpStatus.FORBIDDEN).json({ message: `This API is for ${allowed_roles.join(', ')} only` })
                }
                return next()
            })
        })(req, res, next)
    }
}

export const userRequired  = roleRequired([AllRoles.user, AllRoles.bot, AllRoles.admin])
export const adminRequired = roleRequired([AllRoles.admin])

export function adminOrSelf(conn, msg) {
    if ((msg.uid !== conn.user.uid) && (conn.user.role !== AllRoles.admin)) {
        return Promise.reject('Permission denied')
    }
    return Promise.resolve()
}
