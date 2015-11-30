from flask import Blueprint
from flask.json import jsonify
from flask.ext.login import current_user
from flask.ext.login import login_required
from ..db import register_resource
from ..auth import admin_required
from .models import User

auth_api = Blueprint('auth_api', __name__)

@auth_api.route('/v1/self')
@login_required
def whoami():
    return jsonify(dict(
        id         = current_user['id'],
        username   = current_user['username'],
        first_name = current_user['first_name'],
        last_name  = current_user['last_name'],
        email      = current_user['email'],
        roles      = current_user['roles'],
    ))

register_resource(auth_api, User, url_prefix='/v1/users',
                  read=True, read_single=True,
                  read_decorators = [admin_required])
