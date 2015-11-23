import httplib
from bunch import Bunch
from flask.ext.restless import ProcessingException
from flask.ext.security import current_user
from flask_principal import RoleNeed, Permission

roles = Bunch(
    Admin = 'admin',
    User = 'user',
)

def _ensure_role(*role_names):
    if not current_user.is_authenticated():
        raise ProcessingException(description='Authentication required', code=httplib.UNAUTHORIZED)
    perm = Permission(*[RoleNeed(role_name) for role_name in role_names])
    if not perm.can():
        raise ProcessingException(description='Not allowed', code=httplib.FORBIDDEN)

def admin_required(*args, **kwargs):
    '''A Flask-Restless preprocessor that ensures an admin is about
    to use an API call.
    '''
    return _ensure_role(roles.Admin)

def user_required(*args, **kwargs):
    '''A Flask-Restless preprocessor that ensures a regular user is
    about to use an API call.
    '''
    return _ensure_role(roles.User)
