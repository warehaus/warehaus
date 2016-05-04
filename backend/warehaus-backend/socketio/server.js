#!/usr/bin/env node

var http = require('http');
var socketio = require('socket.io');
var logger = require('../logger');
var models = require('../models');
var getSettings = models.getSettings;
var _changes = require('./changes');
var sendEntireObject = _changes.sendEntireObject;
var sendObjectId = _changes.sendObjectId;
var listenForChanges = _changes.listenForChanges;

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
    return io;
};

var errorHandler = (err) => {
    logger.error(err);
    process.exit(1);
};

getSettings()
    .then(startServer)
    .then(listenForChanges(TABLE_NOTIFICATIONS))
    .catch(errorHandler);
