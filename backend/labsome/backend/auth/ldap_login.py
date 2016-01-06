from flask import request
from .roles import roles
from .ldap_server import LdapServer
from .ldap_server import LdapError
from ..auth.models import User

def validate_ldap_user(username, password):
    if username.strip() == '':
        raise ValueError('Please fill-in your username')

    if password.strip() == '':
        raise ValueError('Please fill-in your password')

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
