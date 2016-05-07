'use strict';

const store = require('./store');
const Settings = store.defineResource('settings');

const SETTINGS_ID = 1;

const getSettings = function() {
    return Settings.find(SETTINGS_ID);
};

module.exports = {
    SETTINGS_ID,
    Settings,
    getSettings
};
