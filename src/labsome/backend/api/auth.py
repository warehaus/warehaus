from flask import Blueprint
from flask.json import jsonify
from flask.ext.security import current_user
from ..auth import user_required

auth_api = Blueprint('auth', __name__)

@auth_api.route('/v1/self')
@user_required
def whoami():
    return jsonify(dict(
        username   = current_user.username,
        first_name = current_user.first_name,
        last_name  = current_user.last_name,
        email      = current_user.email,
        roles      = tuple(role.name for role in current_user.roles),
    ))
