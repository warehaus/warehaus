#!/usr/bin/env node

'use strict';

var logger = require('../logger');
var models = require('../models');
var getSettings = models.getSettings;

var express    = require('express');
var bodyParser = require('body-parser');
var morgan     = require('morgan');
var passport   = require('passport');

var passwordHandler = require('./passwords').passwordHandler;
var firstUser       = require('./first-user');
var jwtAuth         = require('./jwt').jwtAuth;
var localAuth       = require('./local').localAuth;
var googleAuth      = require('./google').googleAuth;
var loginRoutes     = require('./login-routes');
var userRoutes      = require('./user-routes');
var _util           = require('./util');

var app = express();

app.use(morgan('common'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.disable('etag');
app.use(passport.initialize());
app.use('/api/auth/login', loginRoutes);
app.use('/api/auth/users', userRoutes);

app.get('/api/auth/self', passport.authenticate('jwt'), function(req, res) {
    res.json(_util.cleanedUser(req.user));
});

const HTTP_PORT = process.env.HTTP_PORT || 5002;

var set_secrets = function(settings) {
    jwtAuth.setJwtSecret(settings.jwt_secret);
    passwordHandler.setSalt(settings.password_salt);
    return settings;
};

var configure_backends = function(settings) {
    localAuth.configureStrategy(settings);
    googleAuth.configureStrategy(settings);
    jwtAuth.configureStrategy(settings);
};

var start_server = function() {
    app.listen(HTTP_PORT);
    logger.info(`Auth server listening on :${HTTP_PORT}`);
};

var error_handler = function(err) {
    logger.error(err);
    process.exit(1);
};

getSettings()
    .then(set_secrets)
    .then(configure_backends)
    .then(firstUser.ensureAdminUser)
    .then(start_server)
    .catch(error_handler);
