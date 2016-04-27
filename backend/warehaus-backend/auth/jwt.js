'use strict';

var logger = require('../logger');
var models = require('../models'),
    User = models.User;
var jsonwebtoken = require('jsonwebtoken');
var HttpStatus = require('http-status-codes');
var passport = require('passport');
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;

const JWT_EXPIRATION = '7d';

class JwtAuth {
    constructor() {
        this.jwt_secret = undefined;
    }

    setJwtSecret(new_jwt_secret) {
        this.jwt_secret = new_jwt_secret;
    }

    makeJwtForAuthenticatedUser(req, res, next) {
        var self = this;
        return function(err, user, info) {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.status(HttpStatus.UNAUTHORIZED).json(info);
            }
            var token = jsonwebtoken.sign({sub: user.id}, self.jwt_secret, {
                expiresIn: JWT_EXPIRATION,
                notBefore: 0
            });
            return res.json({ access_token: token });
        };
    }

    configureStrategy() {
        var opts = {};
        opts.jwtFromRequest = ExtractJwt.fromAuthHeader();
        opts.secretOrKey = this.jwt_secret;

        passport.unuse('jwt');
        passport.use('jwt', new JwtStrategy(opts, function(jwt_payload, done) {
            if (!jwt_payload.sub) {
                return done(null, false, { message: 'JWT token is invalid because it is missing the sub claim' });
            }
            User.find(jwt_payload.sub).then(function(user) {
                done(null, user);
            }).catch(err => {
                logger.error('Received a valid JWT but could not find the user in the database:');
                logger.error(err);
                done(null, false);
            });
        }));
    }
};

module.exports = {
    jwtAuth: new JwtAuth()
};
