from flask import Blueprint
from flask.json import jsonify
from flask.ext.login import current_user
from flask.ext.login import login_required
from ..db import register_resource
from ..auth import user_required
from ..auth import admin_required
from .models import User
from .roles import roles

auth_api = Blueprint('auth_api', __name__)

def cleaned_user(user):
    if roles.Admin in current_user.roles:
        return user
    return dict(
        id         = user['id'],
        username   = user['username'],
        first_name = user['first_name'],
        last_name  = user['last_name'],
        email      = user['email'],
    )

@auth_api.route('/v1/self')
@login_required
def whoami():
    user = cleaned_user(current_user.as_dict())
    user['roles'] = current_user.roles
    return jsonify(user)

register_resource(auth_api, User, url_prefix='/v1/users',
                  create=True, create_decorators=[admin_required],
                  read=True, read_single=True, read_decorators=[user_required], read_hook=cleaned_user,
                  update_single=True, update_decorators=[admin_required],
                  delete_single=True, delete_decorators=[admin_required])
