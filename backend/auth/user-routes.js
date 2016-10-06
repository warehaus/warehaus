import express from 'express'
import HttpStatus from 'http-status-codes'
import { createNewUserEvent } from './events'
import passwordHasher from './password-hasher'
import logger from '../logger'
import { User } from '../models'
import { AllRoles, adminRequired, userRequired, isRoleValid } from './roles'

const router = express.Router()
export default router

function cleanedUser(user) {
    return {
        id           : user.id,
        role         : user.role,
        username     : user.username,
        has_password : Boolean(user.hashed_password),
        display_name : user.display_name,
        email        : user.email,
        ssh_keys     : user.ssh_keys || []
    }
}

router.param('userId', function(req, res, next, userId) {
    User.find(userId).then(user => {
        req.inputUser = user
        return next()
    }).catch(next)
})

router.get('', userRequired, function(req, res, next) {
    User.findAll().then(all_users => {
        var cleaned_users = []
        for (var i = 0; i < all_users.length; ++i) {
            cleaned_users.push(cleanedUser(all_users[i]))
        }
        res.json({ objects: cleaned_users })
    }).catch(next)
})

router.post('', adminRequired, function(req, res) {
    const now = new Date()
    const new_user = {
        created_at   : now,
        modified_at  : now,
        username     : req.body.username,
        display_name : req.body.display_name,
        role         : req.body.role,
        email        : req.body.email
    }
    if (!new_user.username || !new_user.display_name || !new_user.role) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: 'One of these fields is missing: username, display_name, role' })
        return
    }
    if (!isRoleValid(new_user.role)) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: 'The role you specified for the new user is invalid' })
        return
    }
    User.isUsernameTaken(new_user.username)
        .then(username_taken => {
            if (username_taken) {
                return res.status(HttpStatus.CONFLICT).json({ message: 'Username already in use' })
            }
            return User.create(new_user)
                .then(createNewUserEvent).then(function(new_user_doc) {
                    res.status(HttpStatus.CREATED).json(cleanedUser(new_user_doc))
                })
        })
})

router.get('/:userId', userRequired, function(req, res) {
    res.json(cleanedUser(req.inputUser))
})

router.delete('/:userId', adminRequired, function(req, res) {
    if (req.inputUser.id === req.user.id) {
        res.status(HttpStatus.CONFLICT).json({ message: "You can't delete your own user" })
    } else {
        req.inputUser.role = AllRoles.deleted
        req.inputUser.save()
        res.json({ deleted: true })
    }
})

router.put('/:userId', userRequired, check_allowed("You're not allowed to update this user"), function(req, res) {
    const update_username = function(updated_fields) {
        if (!req.body.username) {
            logger.debug('  no need to update username')
            return updated_fields
        }
        return User.isUsernameTaken(req.body.username).then(username_taken => {
            if (username_taken) {
                logger.debug('  username is taken')
                throw { status: HttpStatus.CONFLICT, message: 'Username already taken' }
            }
            updated_fields.username = req.body.username
            logger.debug('  successfully updated username')
            return updated_fields
        })
    }

    const check_password_if_user_has_one = function() {
        if (req.user.role === AllRoles.admin) {
            logger.debug('  current user is admin, not verifying current password')
            return Promise.resolve(true)
        }
        if (req.inputUser.hashed_password) {
            if (!req.body.password.current) {
                throw { status: HttpStatus.BAD_REQUEST, message: 'You must provide your current password to set a new one' }
            }
            return passwordHasher.checkPassword(req.body.password.current, req.inputUser.hashed_password)
        }
        logger.debug('  user has no password set, not verifying current password')
        return Promise.resolve(true)
    }

    const update_password = function(updated_fields) {
        if (!req.body.password) {
            logger.debug('  no need to update password')
            return updated_fields
        }
        if (!req.body.password.new_password) {
            logger.debug('  no new password given')
            throw { status: HttpStatus.BAD_REQUEST, message: 'No new password given' }
        }
        return check_password_if_user_has_one().then(is_cur_password_ok => {
            if (!is_cur_password_ok) {
                throw { status: HttpStatus.FORBIDDEN, message: 'Current password is incorrect' }
            }
            return passwordHasher.hashPassword(req.body.password.new_password).then(hashed_password => {
                updated_fields.hashed_password = hashed_password
                logger.debug('  successfully updated password')
                return updated_fields
            })
        })
    }

    const update_display_name = function(updated_fields) {
        if (req.body.display_name) {
            updated_fields.display_name = req.body.display_name
            logger.debug('  successfully updated display name')
        } else {
            logger.debug('  no need to update display name')
        }
        return updated_fields
    }

    const update_email = function(updated_fields) {
        if (req.body.email) {
            updated_fields.email = req.body.email
            logger.debug('  successfully updated email')
        } else {
            logger.debug('  no need to update email')
        }
        return updated_fields
    }

    const update_role = function(updated_fields) {
        if (!req.body.role) {
            logger.debug('  no need to update role')
        } else if (req.user.role !== AllRoles.admin) {
            logger.debug('  no permission to update role')
            throw { status: HttpStatus.FORBIDDEN, message: "You can't update your own role" }
        } else if (!isRoleValid(req.body.role)) {
            logger.debug('  invalid role to update')
            throw { status: HttpStatus.BAD_REQUEST, message: 'Updated role is invalid' }
        } else {
            updated_fields.role = req.body.role
            logger.debug('  successfully updated role')
        }
        return updated_fields
    }

    logger.info('Starting user update:', req.body)

    return Promise.resolve({})
        .then(update_username)
        .then(update_password)
        .then(update_display_name)
        .then(update_email)
        .then(update_role)
        .then((updated_fields) => {
            updated_fields.modified_at = new Date()
            return req.inputUser.update(updated_fields)
        })
        .then(updated_user => {
            res.json(updated_user)
        })
        .catch(err => {
            logger.error(err)
            res.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message || err })
        })
})

const _get_key_comment = function(ssh_key) {
    const parts = ssh_key.match(/^\s*(ssh-.+)\s+(.+)\s+(.+)\s*$/)
    if (parts && (parts.length === 4)) {
        return parts[3]
    }
    return null
}

router.post('/:userId/ssh-keys', userRequired, check_allowed("You can't add SSH-keys for other users"), function(req, res) {
    const key_to_add = req.body.ssh_key
    if (!key_to_add || !key_to_add.contents) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Missing ssh_key argument' })
    }
    if (req.inputUser.ssh_keys) {
        for (var i = 0; i < req.inputUser.ssh_keys.length; ++i) {
            const existing_key = req.inputUser.ssh_keys[i]
            if (existing_key.contents === key_to_add.contents) {
                return res.status(HttpStatus.CONFLICT).json({ message: 'This key is already saved' })
            }
        }
    }
    const new_key = {
        created_at: new Date(),
        contents: key_to_add.contents,
        comment: key_to_add.comment
    }
    if (!new_key.comment) {
        new_key.comment = _get_key_comment(key_to_add.contents)
    }
    const updated_ssh_keys = (req.inputUser.ssh_keys || []).concat(new_key)
    return User.update(req.inputUser.id, { ssh_keys: updated_ssh_keys }).then(doc => {
        res.status(HttpStatus.CREATED).json(doc)
    }).catch(err => {
        logger.error('Could not save user in database:', err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error saving SSH-key' })
    })
})

router.delete('/:userId/ssh-keys', userRequired, check_allowed("You can't delete SSH-keys for other users"), function(req, res) {
    const key_to_delete = req.body.ssh_key
    if (!key_to_delete || !key_to_delete.contents) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Missing ssh_key argument' })
    }
    const existing_keys = req.inputUser.ssh_keys || []
    const updated_ssh_keys = existing_keys.filter(existing_key => existing_key.contents !== key_to_delete.contents)
    if (existing_keys.length === updated_ssh_keys.length) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: 'No such SSH key' })
    }
    return User.update(req.inputUser.id, { ssh_keys: updated_ssh_keys }).then(() => {
        res.status(HttpStatus.NO_CONTENT).json(null)
    }).catch(err => {
        logger.error('Could not save user in database:', err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error deleting SSH-key' })
    })
})
