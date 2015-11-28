import os
import signal
import httplib
from flask import Blueprint
from flask import request
from flask import make_response
from flask.json import jsonify
from ..settings.models import edit_settings
from ..auth import user_datastore
from ..auth import roles
from ..auth.ldap_login import LdapServer
from ..auth.ldap_login import LdapError

first_setup_api = Blueprint('first_setup_api', __name__)

@first_setup_api.route('/test', methods=['POST'])
def test():
    ldap_settings = request.json['ldap']
    admin_username = request.json['admin_username']
    admin_password = request.json['admin_password']

    try:
        ldap_server = LdapServer(**ldap_settings)
        test_result = ldap_server.attempt_login(admin_username, admin_password)
        return jsonify(test_result)
    except LdapError as error:
        return make_response(str(error), httplib.BAD_REQUEST)

@first_setup_api.route('/configure', methods=['POST'])
def configure():
    ldap_settings = request.json['ldap']
    admin_username = request.json['admin_username']

    admin_user = user_datastore.get_user(admin_username)
    if admin_user is None:
        admin_user = user_datastore.create_user(username=admin_username)
    user_datastore.add_role_to_user(admin_user, roles.Admin)
    user_datastore.add_role_to_user(admin_user, roles.User)

    with edit_settings() as settings:
        settings.is_initialized = True
        settings.LDAP_SETTINGS = ldap_settings

    return 'ok'

@first_setup_api.route('/restart-server', methods=['POST'])
def restart_server():
    print '=== RESTARTING SERVER ==='
    os.kill(os.getpid(), signal.SIGTERM)
