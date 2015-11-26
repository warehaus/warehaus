from flask import Blueprint
from flask import request
from flask.json import jsonify
from flask.ext.security import login_required
from flask.ext.security import roles_required
from ..auth import roles
from ..config import get_settings
from ..config import edit_settings

settings_api = Blueprint('settings_api', __name__)

@settings_api.route('/v1/ldap')
@login_required
@roles_required(roles.Admin)
def get_ldap_settings():
    settings = get_settings()
    return jsonify(settings.LDAP_SETTINGS)

@settings_api.route('/v1/ldap', methods=['POST'])
@login_required
@roles_required(roles.Admin)
def edit_ldap_settings():
    new_ldap_settings = request.json
    with edit_settings() as settings:
        settings.LDAP_SETTINGS = new_ldap_settings
    return jsonify(settings.LDAP_SETTINGS)
