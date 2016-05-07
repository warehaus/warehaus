#!/usr/bin/env node

var http = require('http');
var socketio = require('socket.io');
var logger = require('../logger');
var getSettings = require('../models/settings').getSettings;
var _changes = require('./changes');
var USERS_ROOM = _changes.USERS_ROOM;
var sendEntireObject = _changes.sendEntireObject;
var sendObjectId = _changes.sendObjectId;
var listenForChanges = _changes.listenForChanges;
var socketioJwt = require('socketio-jwt');

const HTTP_PORT = process.env.HTTP_PORT || 5001;

const TABLE_NOTIFICATIONS = [
    { dbTable: 'object', onUpdate: sendEntireObject, onDelete: sendObjectId },
    { dbTable: 'user',   onUpdate: sendObjectId,     onDelete: sendObjectId },
    { dbTable: 'event',  onUpdate: sendEntireObject, onDelete: sendObjectId }
];

const startServer = (settings) => {
    var http_server = http.createServer();
    var io = new socketio(http_server);
    http_server.listen(HTTP_PORT);
    logger.info(`Notification server listening on :${HTTP_PORT}`);
    return { io, settings };
};

const setupAuth = (ctx) => {
    var io = ctx.io;
    var settings = ctx.settings;
    io.sockets
        .on('connection', socketioJwt.authorize({
            secret: settings.jwt_secret,
            timeout: 10000 // milliseconds
        }))
        .on('authenticated', (socket) => {
            socket.join(USERS_ROOM);
        });
    return { io, settings };
};

var errorHandler = (err) => {
    logger.error(err);
    process.exit(1);
};

getSettings()
    .then(startServer)
    .then(setupAuth)
    .then(listenForChanges(TABLE_NOTIFICATIONS))
    .catch(errorHandler);
