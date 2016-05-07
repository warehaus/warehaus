'use strict';

var express = require('express');
var passport = require('passport');
var User = require('../models/user').User;
var getSettings = require('../models/settings').getSettings;
var Settings = require('../models/settings').Settings;
var SETTINGS_ID = require('../models/settings').SETTINGS_ID;
var _util = require('./util');
var jwtAuth = require('./jwt').jwtAuth;
var googleAuth = require('./google').googleAuth;
var roles = require('./roles');
var adminRequired = roles.adminRequired;

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.find(id, function(err, user) {
        done(err, user);
    });
});

var router = express.Router();

router.get('', function(req, res) {
    getSettings().then(settings => {
        res.json({
            local: true,
            google: googleAuth.isConfigured(settings)
        });
    }, _util.failureResponse).catch(_util.failureResponse);
});

router.post('/local', function(req, res, next) {
    passport.authenticate('local', jwtAuth.makeJwtForAuthenticatedUser(req, res, next))(req, res, next);
});

router.get('/google/settings', adminRequired, function(req, res) {
    return getSettings().then(settings => {
        if (!settings.auth || !settings.auth.google) {
            return res.json({});
        }
        return res.json({ google_settings: settings.auth.google });
    }, _util.failureResponse).catch(_util.failureResponse);
});

router.post('/google/settings', adminRequired, function(req, res) {
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
    }, _util.failureResponse).catch(_util.failureResponse);
});

router.get('/google', function(req, res, next) {
    getSettings().then(settings => {
        var options = { scope: ['profile', 'email'] };
        if (settings.auth.google.hosted_domain) {
            options['hd'] = settings.auth.google.hosted_domain;
        }
        return passport.authenticate('google', options)(res, res, next);
    }, _util.failureResponse);
});

router.get('/google/callback', function(req, res, next) {
    passport.authenticate('google', jwtAuth.makeJwtForAuthenticatedUser(req, res, next))(req, res, next);
});

module.exports = router;
