'use strict';

const store = require('./store');
const Event = store.defineResource('event');

const createEvent = (event) => {
    var now = new Date();
    return Event.create({
        created_at     : now,
        modified_at    : now,
        obj_id         : event.objId,
        user_id        : event.userId,
        interested_ids : event.interestedIds || [],
        title          : event.title,
        content        : event.content || ''
    });
};

module.exports = {
    Event,
    createEvent
};
