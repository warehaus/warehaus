import httplib
from functools import wraps
from bunch import Bunch
from flask import abort as flask_abort
from flask_jwt import current_identity
from flask_jwt import jwt_required
roles = Bunch(
    Admin = 'admin',
    User = 'user',
)

def _require_roles(*role_names):
    if set(role_names) - set(current_identity.roles):
        flask_abort(httplib.FORBIDDEN)

def admin_required(func):
    @wraps(func)
    @jwt_required()
    def wrapper(*args, **kwargs):
        _require_roles(roles.Admin)
        return func(*args, **kwargs)
    return wrapper

def user_required(func):
    @wraps(func)
    @jwt_required()
    def wrapper(*args, **kwargs):
        _require_roles(roles.User)
        return func(*args, **kwargs)
    return wrapper
