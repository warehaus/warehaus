import httplib
from functools import wraps
from logging import getLogger
from bunch import Bunch
from flask import abort as flask_abort
from flask_jwt import current_identity
from flask_jwt import jwt_required
from flask_jwt import JWTError
from .auth_token import attempt_auth_token_login

logger = getLogger(__name__)

roles = Bunch(
    Admin = 'admin',
    User = 'user',
)

def _check_roles(*role_names):
    if set(role_names) - set(current_identity.roles):
        flask_abort(httplib.FORBIDDEN)

@jwt_required()
def _check_jwt_roles(*role_names):
    _check_roles(*role_names)

def _require_roles(*role_names):
    if attempt_auth_token_login():
        _check_roles(*role_names)
    else:
        try:
            _check_jwt_roles()
        except JWTError as error:
            logger.exception(str(error))
            flask_abort(httplib.UNAUTHORIZED, str(error))

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
