'use strict';

var logger          = require('../logger');
var models          = require('../models');
var User            = models.User;
var roles           = require('./roles');
var passwordHandler = require('./passwords').passwordHandler;

const FIRST_USER_USERNAME = 'admin';
const FIRST_USER_PASSWORD = 'admin';

var firstUser = function() {
    return passwordHandler.hashPassword(FIRST_USER_PASSWORD).then(hashed_password => {
        var now = new Date();
        return {
            created_at: now,
            modified_at: now,
            username: FIRST_USER_USERNAME,
            hashed_password: hashed_password,
            role: roles.ALL.admin,
            display_name: 'Admin'
        };
    });
};

var ensureAdminUser = function() {
    return User.findAll().then(all_users => {
        var user_count = all_users.length;
        if (user_count === 0) {
            logger.warn(`No users found, creating a new user "${FIRST_USER_USERNAME}" with password "${FIRST_USER_PASSWORD}"`);
            return firstUser().then(user => {
                return User.create(user);
            });
        }
        logger.debug(`There are ${user_count} users in the database`);
    }).catch(err => {
        logger.error('Could not read users from database');
        throw err;
    });
};

module.exports = {
    ensureAdminUser: ensureAdminUser
};
