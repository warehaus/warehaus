import httplib
from functools import wraps
from bunch import Bunch
from flask import abort as flask_abort
from flask.ext.login import current_user

roles = Bunch(
    Admin = 'admin',
    User = 'user',
)

def _require_roles(*role_names):
    if not current_user.is_authenticated:
        flask_abort(httplib.UNAUTHORIZED)
    if set(role_names) - set(current_user.roles):
        flask_abort(httplib.FORBIDDEN)

def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        _require_roles(roles.Admin)
        return func(*args, **kwargs)
    return wrapper

def user_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        _require_roles(roles.User)
        return func(*args, **kwargs)
    return wrapper
