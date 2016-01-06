import os
import httplib
from logging import getLogger
from flask import Blueprint
from flask import request
from flask import abort as flask_abort
from flask.json import jsonify
from flask_jwt import current_identity
from ..db import register_resource
from .models import User
from .roles import user_required
from .roles import admin_required
from .roles import roles

logger = getLogger(__name__)

auth_api = Blueprint('auth_api', __name__)

SAFE_FIELDS = (
    'id',
    'username',
    'first_name',
    'last_name',
    'email',
    'api_tokens',
)

def cleaned_user(user):
    if roles.Admin in current_identity.roles:
        return user
    return {field_name: user[field_name] for field_name in SAFE_FIELDS}

def cleaned_current_user():
    user = cleaned_user(current_identity.as_dict())
    user['roles'] = current_identity.roles
    return jsonify(user)

@auth_api.route('/v1/self')
@user_required
def whoami():
    return cleaned_current_user()

def _new_api_token(user_id):
    user = User.query.get(user_id)
    if user is None:
        flask_abort(httplib.NOT_FOUND)
    api_token = os.urandom(20).encode('hex')
    user.api_tokens.append(api_token)
    user.save()
    return jsonify(dict(api_token=api_token))

@auth_api.route('/v1/self/api-token', methods=['POST'])
@user_required
def new_self_api_token():
    return _new_api_token(current_identity.id)

@auth_api.route('/v1/users/<user_id>/api-token', methods=['POST'])
@admin_required
def new_user_api_token(user_id):
    return _new_api_token(user_id)

register_resource(auth_api, User, url_prefix='/v1/users',
                  create=True, create_decorators=[admin_required],
                  read=True, read_single=True, read_decorators=[user_required], read_hook=cleaned_user,
                  update_single=True, update_decorators=[admin_required],
                  delete_single=True, delete_decorators=[admin_required])
