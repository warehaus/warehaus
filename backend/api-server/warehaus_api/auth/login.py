from flask import request
from flask import current_app
from .roles import roles
from .ldap_server import LdapServer
from .ldap_server import LdapError
from ..auth.models import User

def _get_test_user(username, user_roles):
    user = User.get_by_username(username)
    if user is None:
        user = User(username=username, roles=user_roles)
        user.first_name = username
        user.last_name  = username
        user.email      = '{}@example.com'.format(username)
        user.save()
    return user

def _validate_test_user(username, password):
    if (username == password == 'admin'):
        return _get_test_user(username, [roles.User, roles.Admin])
    if (username == password == 'user'):
        return _get_test_user(username, [roles.User])
    raise ValueError('Invalid username or password')

def _validate_ldap_user(username, password):
    try:
        ldap_server = LdapServer()
        user_details = ldap_server.attempt_login(username, password)
    except LdapError as error:
        raise ValueError(str(error))
    user = User.get_by_username(username)
    if user is None:
        user = User(username=username, roles=[roles.User])
    user.first_name = user_details.get('attribute_first_name', None)
    user.last_name  = user_details.get('attribute_last_name', None)
    user.email      = user_details.get('attribute_email', None)
    user.save()
    return user

def validate_user(username, password):
    if username.strip() == '':
        raise ValueError('Please fill-in your username')
    if password.strip() == '':
        raise ValueError('Please fill-in your password')
    if current_app.config.get('TESTING', False):
        return _validate_test_user(username, password)
    return _validate_ldap_user(username, password)
