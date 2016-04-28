'use strict';

const API_TOKEN_LENGTH = 20;

var express            = require('express');
var passport           = require('passport');
var crypto             = require('crypto');
var HttpStatus         = require('http-status-codes');
var createNewUserEvent = require('./user-events').createNewUserEvent;
var passwordHandler    = require('./passwords').passwordHandler;
var logger             = require('../logger');
var models             = require('../models');
var User               = models.User;
var isUsernameTaken    = models.isUsernameTaken;
var UserApiToken       = models.UserApiToken;
var _util              = require('./util');
var roles              = require('./roles');

var router = express.Router();

var check_allowed = function(message) {
    return function(req, res, next) {
        if ((req.inputUser.id !== req.user.id) && (req.user.role !== roles.ALL.admin)) {
            return res.status(HttpStatus.FORBIDDEN).json({ message: message });
        }
        next();
    };
};

router.param('userId', function(req, res, next, userId) {
    User.find(userId).then(user => {
        req.inputUser = user;
        return next();
    }).catch(next);
});

router.get('', passport.authenticate('jwt'), function(req, res, next) {
    User.findAll().then(all_users => {
        var cleaned_users = [];
        for (var i = 0; i < all_users.length; ++i) {
            cleaned_users.push(_util.cleanedUser(all_users[i]));
        }
        res.json({ objects: cleaned_users });
    }).catch(next);
});

router.post('', passport.authenticate('jwt'), roles.requireAdmin, function(req, res, next) {
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
        res.status(HttpStatus.CREATED).json(_util.cleanedUser(new_user));
    }).catch(_util.failureResponse);
});

router.get('/:userId', passport.authenticate('jwt'), function(req, res) {
    res.json(_util.cleanedUser(req.inputUser));
});

router.delete('/:userId', passport.authenticate('jwt'), roles.requireAdmin, function(req, res) {
    if (req.inputUser.id === req.user.id) {
        res.status(HttpStatus.CONFLICT).json({ message: "You can't delete your own user" });
    } else {
        req.inputUser.role = roles.ALL.deleted;
        req.inputUser.save();
        res.json({ deleted: true });
    }
});

router.put('/:userId', passport.authenticate('jwt'), check_allowed("You're not allowed to update this user"), function(req, res) {
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

router.get('/:userId/api-tokens', passport.authenticate('jwt'), check_allowed("You can't get API-tokens of other users"), function(req, res) {
    UserApiToken.findAll({ where: { user_id: { '===': req.inputUser.id } } }).then(token_docs => {
        res.json({ api_tokens: token_docs });
    }).catch(err => {
        logger.error('Could not fetch tokens:', err);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching user API-tokens' });
    });
});

router.post('/:userId/api-tokens', passport.authenticate('jwt'), check_allowed("You can't create API-tokens of other users"), function(req, res) {
    crypto.randomBytes(API_TOKEN_LENGTH, function(err, buffer) {
        if (err) {
            logger.error('Error generating new token:', err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error generating new token' });
        }
        var now = new Date();
        var token_doc = {
            id          : buffer.toString('hex'),
            created_at  : now,
            modified_at : now,
            user_id     : req.inputUser.id
        };
        UserApiToken.create(token_doc).then(doc => {
            res.status(HttpStatus.CREATED).json({ api_token: doc.id });
        }).catch(err => {
            logger.error('Could not create new token:', err);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error generating new token' });
        });
    });
});

module.exports = router;
