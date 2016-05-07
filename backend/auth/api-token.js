'use strict';

var User          = require('../models/user').User;
var UserApiToken  = require('../models/user').UserApiToken;
var passport      = require('passport');
var TokenStrategy = require('passport-accesstoken').Strategy;

class ApiTokenAuth {
    configureStrategy() {
        passport.use('token', new TokenStrategy({
            tokenHeader: 'authentication-token',
            tokenField: 'token'
        }, function(token, done) {
            UserApiToken.find(token)
                .then(token_doc => {
                    if (!token_doc) {
                        return done(null, false);
                    }
                    return User.find(token_doc.user_id)
                        .then(user => {
                            if (!user) {
                                return done(null, false);
                            }
                            return done(null, user);
                        })
                        .catch(done);
                })
                .catch(err => {
                    done(null, false);
                });
        }));
    }
}

module.exports = {
    tokenAuth: new ApiTokenAuth()
};
