'use strict';

const store = require('./store');
const User = store.defineResource('user');
const UserApiToken = store.defineResource('user_api_token');
const GoogleUser = store.defineResource('user_google');

const isUsernameTaken = (username) => {
    if (!username) {
        return Promise.resolve(true);
    }
    return User.findAll({
        where: { username: { '===': username } }
    }).then(users => {
        return (users.length > 0);
    });
};

module.exports = {
    User,
    UserApiToken,
    GoogleUser,
    isUsernameTaken
};
