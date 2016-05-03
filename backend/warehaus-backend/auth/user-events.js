'use strict';

var roles = require('./roles');
var Event = require('../models').Event;

var createNewUserEvent = function(new_user) {
    if (roles.isRoleAllowedToLogin(new_user.role)) {
        var now = new Date();
        return Event.create({
            created_at: now,
            modified_at: now,
            obj_id: null,
            user_id: new_user.id,
            interested_ids: [],
            title: `**${new_user.display_name}** joined warehaus`,
            content: ''
        }).then(() => {
            return new_user;
        });
    }
    return Promise.resolve(new_user);
};

module.exports = {
    createNewUserEvent: createNewUserEvent
};
