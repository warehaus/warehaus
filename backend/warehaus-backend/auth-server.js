#!/usr/bin/env node

var logger   = require('./logger');
var models   = require('./models');
var User     = models.User;
var Settings = models.Settings;

var express    = require('express');
var HttpStatus = require('http-status-codes');
var bodyParser = require('body-parser');
var crypto     = require('crypto');
var morgan     = require('morgan');
var jwt        = require('jsonwebtoken');

var app = express();

app.use(morgan('common'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.disable('etag');

/*-------------------------------------------------------------------*/
/* Settings reading from database                                    */
/*-------------------------------------------------------------------*/

const SETTINGS_ID = 1

var read_settings = function() {
    return Settings.find(SETTINGS_ID);
};

var set_secrets = function(settings) {
    app.set('jwt_secret', settings.jwt_secret);
    app.set('password_salt', settings.password_salt);
};

var read_secret_keys = function() {
    return read_settings().then(set_secrets);
};

/*-------------------------------------------------------------------*/
/* Passwords                                                         */
/*-------------------------------------------------------------------*/

var bcrypt = require('bcryptjs');

var dirty_password = function(password) {
    return app.get('password_salt') + password;
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
/* Roles                                                             */
/*-------------------------------------------------------------------*/

const ROLES = {
    admin   : 'admin',
    user    : 'user',
    bot     : 'bot',
    deleted : 'deleted'
};

var is_role_valid = function(role) {
    return Object.keys(ROLES).indexOf(role) !== -1;
};

var is_role_allowed_to_login = function(role) {
    return (role === ROLES.admin) || (role === ROLES.user);
};

/*-------------------------------------------------------------------*/
/* Passport configuration                                            */
/*-------------------------------------------------------------------*/

var passport = require('passport');

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.find(id, function(err, user) {
        done(err, user);
    });
});

var configure_passport = function() {
    configure_local_strategy();
    configure_jwt_strategy();
};

app.use(passport.initialize());

/*-------------------------------------------------------------------*/
/* Local strategy                                                    */
/*-------------------------------------------------------------------*/

var LocalStrategy = require('passport-local');

var configure_local_strategy = function() {
    passport.use(new LocalStrategy(
        function(username, password, done) {
            User.findAll({
                where: { username: { '===': username } }
            }).then(function(users) {
                if (users.length === 0) {
                    done(null, false, { message: 'Incorrect username or password' });
                    return;
                }
                if (users.length > 1) {
                    var multiple_users_err = `Found more than one user with username=${username}`;
                    logger.error(`${multiple_users_err}: ${users}`);
                    return done(null, false, { message: multiple_users_err });
                }
                var user = users[0];
                logger.warn('Got user', user);
                if (!is_role_allowed_to_login(user.role)) {
                    var role_err = `Users with role "${user.role}" are not allowed to login with a password`;
                    logger.error(role_err);
                    return done(null, false, { message: role_err });
                }
                if (user.hashed_password) {
                    check_password(password, user.hashed_password).then(function(is_password_ok) {
                        if (is_password_ok) {
                            done(null, user);
                        } else {
                            done(null, false, { message: 'Incorrect username or password' });
                        }
                    }, done);
                } else {
                    done(null, false, { message: "You can't login because your account doesn't have a password, please ask your admin to create a password for you" });
                }
            }, done).catch(done);
        }
    ));
};

app.post('/api/auth/login/local', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(HttpStatus.UNAUTHORIZED).json(info);
        }
        var token = jwt.sign({sub: user.id}, app.get('jwt_secret'), {
            expiresIn: '7d',
            notBefore: 0
        });
        return res.json({
            access_token: token,
        });
    })(req, res, next);
});

/*-------------------------------------------------------------------*/
/* JWT strategy                                                      */
/*-------------------------------------------------------------------*/

var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;

var configure_jwt_strategy = function() {
    var opts = {};
    opts.jwtFromRequest = ExtractJwt.fromAuthHeader();
    opts.secretOrKey = app.get('jwt_secret');

    passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
        if (!jwt_payload.sub) {
            return done(null, false, { message: 'JWT token is invalid because it is missing the sub claim' });
        }
        User.find(jwt_payload.sub).then(function(user) {
            if (user) {
                done(null, user);
            } else {
                done(null, false);
            }
        }).catch(err => {
            logger.error('Received a valid JWT but could not find the user in the database:');
            logger.error(err);
            done(null, false);
        });
    }));
};

/*-------------------------------------------------------------------*/
/* First user                                                        */
/*-------------------------------------------------------------------*/

const FIRST_USER_USERNAME = 'admin';
const FIRST_USER_PASSWORD = 'admin';

var first_user = function() {
    return hash_password(FIRST_USER_PASSWORD).then(hashed_password => {
        return {
            username: FIRST_USER_USERNAME,
            hashed_password: hashed_password,
            role: ROLES.admin,
            display_name: 'Admin'
        };
    });
};

var ensure_admin_user = function() {
    return User.findAll().then(all_users => {
        var user_count = all_users.length;
        if (user_count === 0) {
            logger.warn(`No users found, creating a new user "${FIRST_USER_USERNAME}" with password "${FIRST_USER_PASSWORD}"`);
            return first_user().then(user => {
                return User.create(user);
            });
        }
        logger.debug(`There are ${user_count} users in the database`);
    }).catch(err => {
        logger.error('Could not read users from database:');
        logger.error(err);
        process.exit(1);
    });
};

/*-------------------------------------------------------------------*/
/* APIs                                                              */
/*-------------------------------------------------------------------*/

const API_TOKEN_LENGTH = 20;

var cleaned_user = function(user) {
    return {
        id           : user.id,
        role         : user.role,
        username     : user.username,
        has_password : Boolean(user.hashed_password),
        display_name : user.display_name,
        email        : user.email
    };
};

app.param('userId', function(req, res, next, userId) {
    User.find(userId).then(user => {
        req.inputUser = user;
        return next();
    }).catch(next);
});

var require_admin = function(req, res, next) {
    if (!req.user) {
        res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
    } else if (req.user.role !== ROLES.admin) {
        res.status(HttpStatus.FORBIDDEN).json({ message: 'This API is for admins only' });
    } else {
        return next();
    }
};

var is_username_taken = function(username) {
    if (!username) {
        return Promise.resolve(true);
    }
    return User.findAll({
        where: { username: { '===': username } }
    }).then(users => {
        return (users.length > 0);
    });
};

// Returns who is the current user
app.get('/api/auth/self', passport.authenticate('jwt'), function(req, res) {
    res.json(cleaned_user(req.user));
});

// Returns information about all users
app.get('/api/auth/users', passport.authenticate('jwt'), function(req, res, next) {
    User.findAll().then(all_users => {
        var cleaned_users = [];
        for (var i = 0; i < all_users.length; ++i) {
            cleaned_users.push(cleaned_user(all_users[i]));
        }
        res.json({ objects: cleaned_users });
    }).catch(next);
});

// Create user
app.post('/api/auth/users', passport.authenticate('jwt'), require_admin, function(req, res, next) {
    var new_user = {
        username     : req.body.username,
        display_name : req.body.display_name,
        role         : req.body.role,
        email        : req.body.email
    };
    if (!new_user.username || !new_user.display_name || !new_user.role) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: 'One of these fields is missing: username, display_name, role' });
        return;
    }
    if (!is_role_valid(new_user.role)) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: 'The role you specified for the new user is invalid' });
        return;
    }
    is_username_taken(new_user.username).then(username_taken => {
        if (username_taken) {
            res.status(HttpStatus.CONFLICT).json({ message: 'Username already in use' });
            return;
        }
        User.create(new_user).then(function(created_user) {
            res.json(created_user);
        });
    }).catch(err => {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err });
    });
});

// Get single user
app.get('/api/auth/users/:userId', passport.authenticate('jwt'), function(req, res) {
    res.json(cleaned_user(req.inputUser));
});

// Delete user
app.delete('/api/auth/users/:userId', passport.authenticate('jwt'), require_admin, function(req, res) {
    if (req.inputUser.id === req.user.id) {
        res.status(HttpStatus.CONFLICT).json({ message: "You can't delete your own user" });
    } else {
        req.inputUser.role = ROLES.deleted;
        req.inputUser.save();
        res.json({ deleted: true });
    }
});

// Alter user data; only works for current user, or all users if admin
app.put('/api/auth/users/:userId', passport.authenticate('jwt'), function(req, res) {
    if ((req.inputUser.id !== req.user.id) && (req.user.role !== ROLES.admin)) {
        res.status(HttpStatus.FORBIDDEN).json({ message: "You're not allowed to update this user" });
        return;
    }

    var update_username = function(updated_fields) {
        if (!req.body.username) {
            logger.debug('  no need to update username');
            return updated_fields;
        }
        return is_username_taken(req.body.username).then(username_taken => {
            if (username_taken) {
                logger.debug('  username is taken');
                throw { status: HttpStatus.CONFLICT, message: 'Username already taken' };
            }
            updated_fields.username = req.body.username;
            logger.debug('  successfully updated username');
            return updated_fields;
        });
    };

    var check_password_if_user_has_one = function() {
        if (req.user.role === ROLES.admin) {
            logger.debug('  current user is admin, not verifying current password');
            return Promise.resolve(true);
        }
        if (req.inputUser.hashed_password) {
            return check_password(req.body.password.current, req.inputUser.hashed_password);
        }
        logger.debug('  user has no password set, not verifying current password');
        return Promise.resolve(true);
    };

    var update_password = function(updated_fields) {
        if (!req.body.password) {
            logger.debug('  no need to update password');
            return updated_fields;
        }
        return check_password_if_user_has_one().then(is_cur_password_ok => {
            if (!is_cur_password_ok) {
                throw { status: HttpStatus.FORBIDDEN, message: 'Current password is incorrect' };
            }
            return hash_password(req.body.password.new_password).then(hashed_password => {
                updated_fields.hashed_password = hashed_password;
                logger.debug('  successfully updated password');
                return updated_fields;
            });
        });
    };

    var update_display_name = function(updated_fields) {
        if (req.body.display_name) {
            updated_fields.display_name = req.body.display_name;
            logger.debug('  successfully updated display name');
        } else {
            logger.debug('  no need to update display name');
        }
        return updated_fields;
    };

    var update_email = function(updated_fields) {
        if (req.body.email) {
            updated_fields.email = req.body.email;
            logger.debug('  successfully updated email');
        } else {
            logger.debug('  no need to update email');
        }
        return updated_fields;
    };

    var update_role = function(updated_fields) {
        if (!req.body.role) {
            logger.debug('  no need to update role');
        } else if (req.user.role !== ROLES.admin) {
            logger.debug('  no permission to update role');
            throw { status: HttpStatus.FORBIDDEN, message: "You can't update your own role" };
        } else if (!is_role_valid(req.body.role)) {
            logger.debug('  invalid role to update');
            throw { status: HttpStatus.BAD_REQUEST, message: 'Updated role is invalid' };
        } else {
            updated_fields.role = req.body.role;
            logger.debug('  successfully updated role');
        }
        return updated_fields;
    };

    logger.info('Starting user update:', req.body);

    return Promise.resolve({})
        .then(update_username)
        .then(update_password)
        .then(update_display_name)
        .then(update_email)
        .then(update_role)
        .then((updated_fields) => {
            return User.update(req.inputUser.id, updated_fields);
        })
        .then(updated_user => {
            res.json(updated_user);
        })
        .catch(err => {
            console.log(err.stack);
            res.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message || err });
        });
});

// Get API tokens
app.get('/api/auth/users/:userId/api-tokens', passport.authenticate('jwt'), function(req, res) {
    if ((req.user.id === req.inputUser.id) || (req.user.role === ROLES.admin)) {
        res.json({ api_tokens: req.inputUser.api_tokens || [] });
    } else {
        res.status(HttpStatus.FORBIDDEN).json({ message: "You can't get API-tokens of other users" });
    }
});

// Create API token
app.post('/api/auth/users/:userId/api-tokens', passport.authenticate('jwt'), function(req, res) {
    if ((req.user.id === req.inputUser.id) || (req.user.role === ROLES.admin)) {
        crypto.randomBytes(API_TOKEN_LENGTH, function(err, buffer) {
            if (err) {
                logger.error('Error generating new token:', err);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error generating new token' });
            } else {
                var new_token = buffer.toString('hex');
                var new_tokens_list = req.inputUser.api_tokens || [];
                new_tokens_list.push(new_token);
                User.update(req.inputUser.id, { api_tokens: new_tokens_list }).then(doc => {
                    res.json({ api_token: new_token });
                }).catch(err => {
                    logger.error('Could not save user in database:', err);
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error generating new token' });
                });
            }
        });
    } else {
        res.status(HttpStatus.FORBIDDEN).json({ message: "You can't create API-tokens of other users" });
    }
});

/*-------------------------------------------------------------------*/
/* Server                                                            */
/*-------------------------------------------------------------------*/

const HTTP_PORT = process.env.HTTP_PORT || 5002;

var start_server = function() {
    app.listen(HTTP_PORT);
    logger.info(`Auth server listening on :${HTTP_PORT}`);
};

var error_handler = function(err) {
    logger.error('error: ' + err);
    process.exit(1);
};

read_secret_keys()
    .then(ensure_admin_user)
    .then(configure_passport)
    .then(start_server)
    .catch(error_handler);
