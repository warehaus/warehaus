from flask import Blueprint
from flask import request
from flask.json import jsonify
from ..auth import admin_required
from .models import get_settings
from .models import edit_settings

settings_api = Blueprint('settings_api', __name__)

@settings_api.route('/v1/ldap')
@admin_required
def get_ldap_settings():
    settings = get_settings()
    return jsonify(settings['ldap_settings'])

@settings_api.route('/v1/ldap', methods=['POST'])
@admin_required
def edit_ldap_settings():
    new_ldap_settings = request.json
    with edit_settings() as settings:
        settings['ldap_settings'] = new_ldap_settings
    return jsonify(settings['ldap_settings'])
