'use strict';

var roles = require('./roles');
var passwordHandler = require('./passwords').passwordHandler;
var logger = require('../logger');
var User = require('../models/user').User;
var passport = require('passport');
var LocalStrategy = require('passport-local');

class LocalAuth {
    configureStrategy() {
        passport.unuse('local');
        passport.use('local', new LocalStrategy(this.handleLogin));
    }

    handleLogin(username, password, done) {
        var search_local_user = function(users) {
            if (users.length === 0) {
                return done(null, false, { message: 'Incorrect username or password' });
            }
            if (users.length > 1) {
                var multiple_users_err = `Found more than one user with username=${username}`;
                logger.error(`${multiple_users_err}: ${users}`);
                return done(null, false, { message: multiple_users_err });
            }
            var user = users[0];
            logger.warn('Got user', user);
            if (!roles.isRoleAllowedToLogin(user.role)) {
                var role_err = `Users with role "${user.role}" are not allowed to login with a password`;
                logger.error(role_err);
                return done(null, false, { message: role_err });
            }
            if (user.hashed_password) {
                return passwordHandler.checkPassword(password, user.hashed_password)
                    .then(function(is_password_ok) {
                        if (is_password_ok) {
                            return done(null, user);
                        }
                        return done(null, false, { message: 'Incorrect username or password' });
                    }, done);
            } else {
                return done(null, false, { message: "You can't login because your account doesn't have a password, please ask your admin to create a password for you" });
            }
        };
        return User.findAll({
            where: { username: { '===': username } }
        }).then(search_local_user, done).catch(done);
    }
}

module.exports = {
    localAuth: new LocalAuth()
};
