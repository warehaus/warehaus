#!/usr/bin/env node

'use strict';

var logger = require('./logger');
var getSettings = require('./models/settings').getSettings;

var express    = require('express');
var bodyParser = require('body-parser');
var morgan     = require('morgan');
var passport   = require('passport');
var authInit   = require('./auth/init');
var firstUser  = require('./auth/first-user');
var authRoutes = require('./auth/routes');

var app = express();

app.use(morgan('common'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.disable('etag');
app.use(passport.initialize());

app.use('/api/auth', authRoutes);

const HTTP_PORT = process.env.HTTP_PORT || 5002;

const startServer = () => {
    app.listen(HTTP_PORT);
    logger.info(`Auth server listening on :${HTTP_PORT}`);
};

const errorHandler = (err) => {
    logger.error(err);
    process.exit(1);
};

getSettings()
    .then(authInit.configureAuth)
    .then(firstUser.ensureAdminUser)
    .then(startServer)
    .catch(errorHandler);
