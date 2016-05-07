'use strict';

var passwordHandler = require('./passwords').passwordHandler;
var jwtAuth         = require('./jwt').jwtAuth;
var tokenAuth       = require('./api-token').tokenAuth;
var localAuth       = require('./local').localAuth;
var googleAuth      = require('./google').googleAuth;

const configureAuth = function(settings) {
    jwtAuth.setJwtSecret(settings.jwt_secret);
    passwordHandler.setSalt(settings.password_salt);
    localAuth.configureStrategy(settings);
    googleAuth.configureStrategy(settings);
    jwtAuth.configureStrategy(settings);
    tokenAuth.configureStrategy(settings);
    return settings;
};

module.exports = {
    configureAuth
};
