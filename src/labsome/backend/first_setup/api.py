import os
import signal
import httplib
from flask import Blueprint
from flask import request
from flask import make_response
from flask.json import jsonify
from ..settings.models import edit_settings
from ..auth.models import User
from ..auth.ldap_login import LdapServer
from ..auth.ldap_login import LdapError
from ..auth import roles

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

    admin_user = User.get_by_username(admin_username)
    if admin_user is None:
        admin_user = User(username=admin_username, roles=[roles.Admin, roles.User])
    admin_user.save()

    with edit_settings() as settings:
        settings['is_initialized'] = True
        settings['ldap_settings'] = ldap_settings

    return 'ok'

@first_setup_api.route('/restart-server', methods=['POST'])
def restart_server():
    print '=== RESTARTING SERVER ==='
    os.kill(os.getpid(), signal.SIGTERM)
