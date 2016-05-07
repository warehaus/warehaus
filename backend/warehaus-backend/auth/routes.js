'use strict';

var express      = require('express');
var passport     = require('passport');
var logger       = require('../logger');
var loginRoutes  = require('./login-routes');
var userRoutes   = require('./user-routes');
var roles        = require('./roles');
var userRequired = roles.userRequired;
var _util        = require('./util');

var router = express.Router();

router.use('/login', loginRoutes);
router.use('/users', userRoutes);

router.get('/self', userRequired, function(req, res) {
    res.json(_util.cleanedUser(req.user));
});

module.exports = router;
