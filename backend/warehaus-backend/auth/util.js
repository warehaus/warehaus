'use strict';

var HttpStatus = require('http-status-codes');

var cleanedUser = function(user) {
    return {
        id           : user.id,
        role         : user.role,
        username     : user.username,
        has_password : Boolean(user.hashed_password),
        display_name : user.display_name,
        email        : user.email,
        ssh_keys     : user.ssh_keys || []
    };
};

var failureResponse = function(err) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err });
};

module.exports = {
    cleanedUser: cleanedUser,
    failureResponse: failureResponse
};
