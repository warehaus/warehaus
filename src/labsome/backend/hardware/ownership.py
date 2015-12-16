import httplib
from flask import request
from flask import abort as flask_abort
from flask.json import jsonify
from flask.ext.login import current_user
from ..db.times import now
from ..auth.models import User
from ..auth.roles import roles
from ..auth.roles import user_required
from .models import Object
from .all_types import all_types

def _get_object(obj_id):
    obj = Object.query.get(obj_id)
    if obj is None:
        flask_abort(httplib.NOT_FOUND, 'No object with id={!r}'.format(obj_id))
    return obj

def _get_user(user_id):
    user = User.query.get(user_id)
    if user is None:
        flask_abort(httplib.NOT_FOUND, 'No user with id={!r}'.format(user_id))
    return user

def _allows_ownership(obj):
    try:
        hw_type = all_types[obj.type_key]
    except AttributeError:
        return False
    return hw_type.allow_ownership()

def _check_allows_ownership(obj):
    if not _allows_ownership(obj):
        flask_abort(httplib.FORBIDDEN, 'Objects of type {!r} do not support ownership'.format(obj.type_key))

def register_ownership_api(hardware_api):
    @hardware_api.route('/objects/<obj_id>/ownership/<owner_id>', methods=['POST'])
    @user_required
    def add_owner_to_object(obj_id, owner_id):
        obj = _get_object(obj_id)
        new_owner = _get_user(owner_id)
        _check_allows_ownership(obj)
        if (roles.Admin not in current_user.roles) and (owner_id != current_user.id):
            flask_abort(httplib.FORBIDDEN, 'You cannot add ownerships for other users')
        if len(obj.ownerships) >= 1:
            flask_abort(httplib.CONFLICT, 'Only one owner allowed')
        if all(ownership['owner_id'] != owner_id for ownership in obj.ownerships):
            obj.ownerships.append(dict(
                owner_id = owner_id,
                obtained_at = now(),
            ))
        obj.save()
        return jsonify(obj.as_dict()), httplib.ACCEPTED

    @hardware_api.route('/objects/<obj_id>/ownership/<owner_id>', methods=['DELETE'])
    @user_required
    def delete_owner_from_object(obj_id, owner_id):
        obj = _get_object(obj_id)
        owner = _get_user(owner_id)
        _check_allows_ownership(obj)
        if (roles.Admin not in current_user.roles) and (owner_id != current_user.id):
            flask_abort(httplib.FORBIDDEN, 'You cannot remove ownerships of other users')
        obj.ownerships = list(ownership for ownership in obj.ownerships if ownership['owner_id'] != owner_id)
        obj.save()
        return jsonify(obj.as_dict()), httplib.ACCEPTED
