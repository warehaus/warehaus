'use strict';

var HttpStatus = require('http-status-codes');

const ALL = {
    admin   : 'admin',
    user    : 'user',
    bot     : 'bot',
    deleted : 'deleted'
};

var isRoleValid = function(role) {
    return Object.keys(ALL).indexOf(role) !== -1;
};

var isRoleAllowedToLogin = function(role) {
    return (role === ALL.admin) || (role === ALL.user);
};

var requireAdmin = function(req, res, next) {
    if (!req.user) {
        res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
    } else if (req.user.role !== ALL.admin) {
        res.status(HttpStatus.FORBIDDEN).json({ message: 'This API is for admins only' });
    } else {
        return next();
    }
};

module.exports = {
    ALL: ALL,
    isRoleValid: isRoleValid,
    isRoleAllowedToLogin: isRoleAllowedToLogin,
    requireAdmin: requireAdmin
};
