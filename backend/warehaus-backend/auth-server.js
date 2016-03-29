#!/usr/bin/env node

var logger   = require('./logger');
var models   = require('./models');
var User     = models.User;
var Settings = models.Settings;

var express    = require('express');
var bodyParser = require('body-parser');
var morgan     = require('morgan');
var jwt        = require('jsonwebtoken');

var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/*-------------------------------------------------------------------*/
/* Settings reading from database                                    */
/*-------------------------------------------------------------------*/

const SETTINGS_ID = 1

var read_settings = function() {
    return Settings.find(SETTINGS_ID);
};

var set_secret_key = function(settings) {
    app.set('secret_key', settings.secret_key);
};

var read_secret_key = function() {
    return read_settings().then(set_secret_key);
};

/*-------------------------------------------------------------------*/
/* Passwords                                                         */
/*-------------------------------------------------------------------*/

var dirty_password = function(password) {
    return app.get('secret_key') + password;
};

var hash_password = function(password) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(10, function(err, salt) {
            if (err) {
                logger.error('Error in bcrypt.genSalt:', err);
                reject(err);
            } else {
                bcrypt.hash(dirty_password(password), salt, function(err, hash) {
                    if (err) {
                        logger.error('Error in bcrypt.hash:', err);
                        reject(err);
                    } else {
                        resolve(hash);
                    }
                });
            }
        });
    });
};

var check_password = function(password, saved_hash) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(dirty_password(password), saved_hash, function(err, result) {
            if (err) {
                logger.error('Error in bcrypt.compare:', err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

/*-------------------------------------------------------------------*/
/* Passport configuration                                            */
/*-------------------------------------------------------------------*/

var passport      = require('passport');
var LocalStrategy = require('passport-local');
var bcrypt        = require('bcryptjs');

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.find(id, function(err, user) {
        done(err, user);
    });
});

var configure_local_strategy = function() {
    passport.use(new LocalStrategy(
        function(username, password, done) {
            User.findAll({
                where: { username: { '===': username } }
            }).then(function(users) {
                if (users.length === 0) {
                    done(null, false, { message: 'Incorrect username or password' });
                } else if (users.length > 1) {
                    var err = `Found more than one user with username=${username}`;
                    logger.error(`${err}: ${users}`);
                    done(null, false, { message: err });
                } else {
                    var user = users[0];
                    logger.warn('Got user', user);
                    if (user.hashed_password) {
                        check_password(password, user.hashed_password).then(function(is_password_ok) {
                            if (is_password_ok) {
                                done(null, user);
                            } else {
                                done(null, false, { message: 'Incorrect username or password' });
                            }
                        }, done);
                    } else {
                        done('No password set for this user');
                    }
                }
            }, done);
        }
    ));
};

var configure_passport = function() {
    return configure_local_strategy();
};

app.use(passport.initialize());

/*-------------------------------------------------------------------*/
/* First user                                                        */
/*-------------------------------------------------------------------*/

var first_user = function() {
    return hash_password('admin').then(hashed_password => {
        return {
            username: 'admin',
            hashed_password: hashed_password,
            roles: ['admin', 'user'],
            first_name: 'Local',
            last_name: 'Admin',
        };
    });
};

var ensure_admin_user = function() {
    return User.findAll().then(all_users => {
        var user_count = all_users.length;
        if (user_count === 0) {
            logger.warn('No users found, creating a new user "admin" with password "admin"');
            return first_user().then(user => {
                return User.create(user);
            });
        }
        logger.debug(`There are ${user_count} users in the database`);
    });
};

/*-------------------------------------------------------------------*/
/* Server & APIs                                                     */
/*-------------------------------------------------------------------*/

const HTTP_PORT = process.env.HTTP_PORT || 5002;

app.post('/auth/login/local', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return next(err);
        }

        if (!user) {
            return res.status(401).json(info);
        }

        var token = jwt.sign({identity: user.id}, app.get('secret_key'), {
            expiresIn: '7d',
            notBefore: 0,
        });

        return res.json({
            access_token: token,
        });
    })(req, res, next);
});

var start_server = function() {
    app.listen(HTTP_PORT);
    logger.info(`Auth server listening on :${HTTP_PORT}`);
};

var error_handler = function(err) {
    logger.error('error: ' + err);
    process.exit(1);
};

read_secret_key()
    .then(ensure_admin_user)
    .then(configure_passport)
    .then(start_server)
    .catch(error_handler);
