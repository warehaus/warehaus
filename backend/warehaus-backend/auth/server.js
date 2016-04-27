#!/usr/bin/env node

'use strict';

var logger = require('../logger');
var User = require('../models').User;
var isUsernameTaken = require('../models').isUsernameTaken;
var Settings = require('../models').Settings;

var express    = require('express');
var HttpStatus = require('http-status-codes');
var bodyParser = require('body-parser');
var crypto     = require('crypto');
var morgan     = require('morgan');

var roles = require('./roles');
var passwordHandler = require('./passwords').passwordHandler;
var firstUser = require('./first-user');
var createNewUserEvent = require('./user-events').createNewUserEvent;
var jwtAuth = require('./jwt').jwtAuth;
var localAuth = require('./local').localAuth;
var googleAuth = require('./google').googleAuth;

/*-------------------------------------------------------------------*/
/* Settings reading from database                                    */
/*-------------------------------------------------------------------*/

const SETTINGS_ID = 1

var read_settings = function() {
    return Settings.find(SETTINGS_ID);
};

var set_secrets = function(settings) {
    jwtAuth.setJwtSecret(settings.jwt_secret);
    passwordHandler.setSalt(settings.password_salt);
    return settings;
};

var read_secret_keys = function() {
    return read_settings().then(set_secrets).catch(err => {
        logger.error('Could not read settings from the database');
        throw err;
    });
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

var configure_passport = function(settings) {
    localAuth.configureStrategy(settings);
    googleAuth.configureStrategy(settings);
    jwtAuth.configureStrategy(settings);
};

var failureResponse = function(err) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err });
};

/*-------------------------------------------------------------------*/
/* App and Routes                                                    */
/*-------------------------------------------------------------------*/

var app = express();

app.use(morgan('common'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.disable('etag');
app.use(passport.initialize());

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

app.get('/api/auth/login', function(req, res) {
    read_settings().then(settings => {
        res.json({
            local: true,
            google: googleAuth.isConfigured(settings)
        });
    }, failureResponse).catch(failureResponse);
});

app.post('/api/auth/login/local', function(req, res, next) {
    passport.authenticate('local', jwtAuth.makeJwtForAuthenticatedUser(req, res, next))(req, res, next);
});

app.get('/api/auth/login/google/settings', passport.authenticate('jwt'), roles.requireAdmin, function(req, res) {
    return read_settings().then(settings => {
        if (!settings.auth || !settings.auth.google) {
            return res.json({});
        }
        return res.json({ google_settings: settings.auth.google });
    }, failureResponse).catch(failureResponse);
});

app.post('/api/auth/login/google/settings', passport.authenticate('jwt'), roles.requireAdmin, function(req, res) {
    var google_settings = {
        is_enabled    : req.body.google_settings.is_enabled,
        client_id     : req.body.google_settings.client_id,
        client_secret : req.body.google_settings.client_secret,
        redirect_uri  : req.body.google_settings.redirect_uri,
        hosted_domain : req.body.google_settings.hosted_domain
    };
    var settings_update = {
        modified_at: new Date(),
        auth: { google: google_settings }
    };
    return Settings.update(SETTINGS_ID, settings_update).then(updated_settings => {
        googleAuth.configureStrategy(updated_settings);
        res.json({ google_settings: updated_settings.auth.google });
    }, failureResponse).catch(failureResponse);
});

app.get('/api/auth/login/google', function(req, res, next) {
    read_settings().then(settings => {
        var options = { scope: ['profile', 'email'] };
        if (settings.auth.google.hosted_domain) {
            options['hd'] = settings.auth.google.hosted_domain;
        }
        return passport.authenticate('google', options)(res, res, next);
    }, failureResponse);
});

app.get('/api/auth/login/google/callback', function(req, res, next) {
    passport.authenticate('google', jwtAuth.makeJwtForAuthenticatedUser(req, res, next))(req, res, next);
});

app.get('/api/auth/self', passport.authenticate('jwt'), function(req, res) {
    res.json(cleaned_user(req.user));
});

app.get('/api/auth/users', passport.authenticate('jwt'), function(req, res, next) {
    User.findAll().then(all_users => {
        var cleaned_users = [];
        for (var i = 0; i < all_users.length; ++i) {
            cleaned_users.push(cleaned_user(all_users[i]));
        }
        res.json({ objects: cleaned_users });
    }).catch(next);
});

app.post('/api/auth/users', passport.authenticate('jwt'), roles.requireAdmin, function(req, res, next) {
    var now = new Date();
    var new_user = {
        created_at   : now,
        modified_at  : now,
        username     : req.body.username,
        display_name : req.body.display_name,
        role         : req.body.role,
        email        : req.body.email
    };
    if (!new_user.username || !new_user.display_name || !new_user.role) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: 'One of these fields is missing: username, display_name, role' });
        return;
    }
    if (!roles.isRoleValid(new_user.role)) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: 'The role you specified for the new user is invalid' });
        return;
    }
    return isUsernameTaken(new_user.username).then(username_taken => {
        if (username_taken) {
            res.status(HttpStatus.CONFLICT).json({ message: 'Username already in use' });
            return;
        }
        return User.create(new_user);
    }).then(createNewUserEvent).then(function(new_user) {
        res.status(HttpStatus.CREATED).json(cleaned_user(new_user));
    }).catch(failureResponse);
});

app.get('/api/auth/users/:userId', passport.authenticate('jwt'), function(req, res) {
    res.json(cleaned_user(req.inputUser));
});

app.delete('/api/auth/users/:userId', passport.authenticate('jwt'), roles.requireAdmin, function(req, res) {
    if (req.inputUser.id === req.user.id) {
        res.status(HttpStatus.CONFLICT).json({ message: "You can't delete your own user" });
    } else {
        req.inputUser.role = roles.ALL.deleted;
        req.inputUser.save();
        res.json({ deleted: true });
    }
});

app.put('/api/auth/users/:userId', passport.authenticate('jwt'), function(req, res) {
    if ((req.inputUser.id !== req.user.id) && (req.user.role !== roles.ALL.admin)) {
        res.status(HttpStatus.FORBIDDEN).json({ message: "You're not allowed to update this user" });
        return;
    }

    var update_username = function(updated_fields) {
        if (!req.body.username) {
            logger.debug('  no need to update username');
            return updated_fields;
        }
        return isUsernameTaken(req.body.username).then(username_taken => {
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
        if (req.user.role === roles.ALL.admin) {
            logger.debug('  current user is admin, not verifying current password');
            return Promise.resolve(true);
        }
        if (req.inputUser.hashed_password) {
            if (!req.body.password.current) {
                throw { status: HttpStatus.BAD_REQUEST, message: 'You must provide your current password to set a new one' };
            }
            return passwordHandler.checkPassword(req.body.password.current, req.inputUser.hashed_password);
        }
        logger.debug('  user has no password set, not verifying current password');
        return Promise.resolve(true);
    };

    var update_password = function(updated_fields) {
        if (!req.body.password) {
            logger.debug('  no need to update password');
            return updated_fields;
        }
        if (!req.body.password.new_password) {
            logger.debug('  no new password given');
            throw { status: HttpStatus.BAD_REQUEST, message: 'No new password given' };
        }
        return check_password_if_user_has_one().then(is_cur_password_ok => {
            if (!is_cur_password_ok) {
                throw { status: HttpStatus.FORBIDDEN, message: 'Current password is incorrect' };
            }
            return passwordHandler.hashPassword(req.body.password.new_password).then(hashed_password => {
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
        } else if (req.user.role !== roles.ALL.admin) {
            logger.debug('  no permission to update role');
            throw { status: HttpStatus.FORBIDDEN, message: "You can't update your own role" };
        } else if (!roles.isRoleValid(req.body.role)) {
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
            updated_fields.modified_at = new Date();
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

app.get('/api/auth/users/:userId/api-tokens', passport.authenticate('jwt'), function(req, res) {
    if ((req.user.id === req.inputUser.id) || (req.user.role === roles.ALL.admin)) {
        res.json({ api_tokens: req.inputUser.api_tokens || [] });
    } else {
        res.status(HttpStatus.FORBIDDEN).json({ message: "You can't get API-tokens of other users" });
    }
});

app.post('/api/auth/users/:userId/api-tokens', passport.authenticate('jwt'), function(req, res) {
    if ((req.user.id === req.inputUser.id) || (req.user.role === roles.ALL.admin)) {
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
    logger.error(err);
    process.exit(1);
};

read_secret_keys()
    .then(configure_passport)
    .then(firstUser.ensureAdminUser)
    .then(start_server)
    .catch(error_handler);
