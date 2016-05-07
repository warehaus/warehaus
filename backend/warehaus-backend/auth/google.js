'use strict';

var passport           = require('passport');
var createNewUserEvent = require('./events').createNewUserEvent;
var logger             = require('../logger');
var User               = require('../models/user').User;
var isUsernameTaken    = require('../models/user').isUsernameTaken;
var GoogleUser         = require('../models/user').GoogleUser;
var GoogleStrategy     = require('passport-google-oauth20').Strategy;

class GoogleAuth {
    isConfigured(settings) {
        return (settings.auth &&
                settings.auth.google &&
                settings.auth.google.is_enabled &&
                settings.auth.google.client_id &&
                settings.auth.google.client_secret &&
                settings.auth.google.redirect_uri);
    }

    configureStrategy(settings) {
        var self = this;
        passport.unuse('google');
        if (this.isConfigured(settings)) {
            logger.info('Configuring Google login');
            passport.use('google', new GoogleStrategy({
                clientID: settings.auth.google.client_id,
                clientSecret: settings.auth.google.client_secret,
                callbackURL: settings.auth.google.redirect_uri
            }, self.authCallback));
        }
    }

    authCallback(accessToken, refreshToken, profile, done) {
        var choose_username = function() {
            // Try to extract the username from the Google email. If it's
            // available, create the local user with that name. Otherwise
            // use the Google ID
            var possible_username = profile.emails[0].value.split('@')[0];
            return isUsernameTaken(possible_username).then(is_taken => {
                return is_taken ? profile.id : possible_username;
            });
        };

        var create_new_local_user = function(username) {
            logger.debug(`Creating new local user for Google user ${profile.id}`);
            var now = new Date();
            return User.create({
                created_at: now,
                modified_at: now,
                username: username,
                display_name: profile.displayName,
                email: profile.emails[0].value,
                role: roles.ALL.user
            });
        };

        var create_new_google_user = function(local_user) {
            logger.debug(`Creating Google user for local user ${local_user.id}`);
            var now = new Date();
            return GoogleUser.create({
                id: profile.id,
                created_at: now,
                modified_at: now,
                access_token: accessToken,
                refresh_token: refreshToken,
                profile: profile,
                local_user_id: local_user.id
            }).then(google_user => {
                logger.debug(`Created Google user ${google_user.id} for local user ${local_user.id}`);
                return local_user
            }, done);
        };

        var create_google_user = function() {
            return choose_username()
                .then(create_new_local_user, done)
                .then(create_new_google_user, done)
                .then(createNewUserEvent, done)
                .then(local_user => { done(null, local_user); }, done);
        };

        var got_google_user = function(google_user) {
            logger.debug(`Found Google user, looking for local user ${google_user.local_user_id}`);
            return User.find(google_user.local_user_id).then(local_user => {
                done(null, local_user);
            }, done);
        };

        logger.debug(`Looking for Google user with profile.id=${profile.id}`);
        return GoogleUser.find(profile.id).then(got_google_user).catch(create_google_user);
    }
}

module.exports = {
    googleAuth: new GoogleAuth()
};
