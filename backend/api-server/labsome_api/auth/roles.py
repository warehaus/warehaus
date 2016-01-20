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

@jwt_required()
def _require_roles(*role_names):
    if set(role_names) - set(current_identity.roles):
        flask_abort(httplib.FORBIDDEN)

def require_admin():
    _require_roles(roles.Admin)

def require_user():
    _require_roles(roles.User)

def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        require_admin()
        return func(*args, **kwargs)
    return wrapper

def user_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        require_user()
        return func(*args, **kwargs)
    return wrapper
