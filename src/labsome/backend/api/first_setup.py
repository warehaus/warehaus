import os
import signal
import httplib
from flask import Blueprint
from flask import request
from flask import make_response
from ..config import edit_settings
from ..auth import user_datastore
from ..auth import roles
from ..auth.ldap_login import attempt_ldap_login
from ..auth.ldap_login import LdapLoginError

first_setup_api = Blueprint('first_setup', __name__)

@first_setup_api.route('/configure', methods=['POST'])
def do_first_setup():
    ldap_server_uri = request.json['ldap_server_uri']
    ldap_base_dn = request.json['ldap_base_dn']
    ldap_username_property = request.json['ldap_username_property']
    admin_username = request.json['admin_username']
    admin_password = request.json['admin_password']

    try:
        attempt_ldap_login(ldap_server_uri=ldap_server_uri,
                           ldap_base_dn=ldap_base_dn,
                           ldap_username_property=ldap_username_property,
                           username=admin_username,
                           password=admin_password)
    except LdapLoginError as error:
        return make_response(str(error), httplib.BAD_REQUEST)

    admin_user = user_datastore.get_user(admin_username)
    if admin_user is None:
        admin_user = user_datastore.create_user(username=admin_username)
    user_datastore.add_role_to_user(admin_user, roles.Admin)
    user_datastore.add_role_to_user(admin_user, roles.User)

    with edit_settings() as settings:
        settings.is_initialized = True
        settings.LDAP_SERVER_URI = ldap_server_uri
        settings.LDAP_BASE_DN = ldap_base_dn
        settings.LDAP_USERNAME_PROPERTY = ldap_username_property

    return 'ok'

@first_setup_api.route('/restart-server', methods=['POST'])
def restart_server():
    print '=== RESTARTING SERVER ==='
    os.kill(os.getpid(), signal.SIGTERM)
