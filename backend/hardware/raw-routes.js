'use strict';

var express      = require('express');
var passport     = require('passport');
var logger       = require('../logger');
var Obj          = require('../models/object').Obj;
var roles        = require('../auth/roles');
var userRequired = roles.userRequired;

var warehausTypeClasses = require('./type-classes');

var router = express.Router();

router.get('/types', userRequired, (req, res) => {
    var types = [];
    warehausTypeClasses.forEach(typeClass => {
        types.push(typeClass);
    });
    res.json({ types });
});

router.get('/objects', userRequired, (req, res) => {
    return Obj.findAll().then((objects) => {
        res.json({ objects });
    });
});

router.get('/objects/:objId', userRequired, (req, res) => {
    return Obj.find(req.params.objId).then((obj) => {
        res.json(obj);
    });
});

module.exports = router;
