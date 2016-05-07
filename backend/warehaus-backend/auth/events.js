'use strict';

var roles = require('./roles');
var createEvent = require('../models/event').createEvent;

const createNewUserEvent = (new_user) => {
    if (roles.isRoleAllowedToLogin(new_user.role)) {
        return createEvent({
            objId: null,
            userId: new_user.id,
            title: `**${new_user.display_name}** joined warehaus`
        }).then(() => {
            return new_user;
        });
    }
    return Promise.resolve(new_user);
};

module.exports = {
    createNewUserEvent
};
