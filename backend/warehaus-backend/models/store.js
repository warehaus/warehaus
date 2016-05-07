'use strict';

const db                 = require('../db');
const jsData             = require('js-data');
const dsRethinkDBAdapter = require('js-data-rethinkdb');

const adapter = new dsRethinkDBAdapter(db.config());
const store   = new jsData.DS();

store.registerAdapter('rethinkdb', adapter, { default: true });

module.exports = store;
