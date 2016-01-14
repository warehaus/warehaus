from flask import request
from flask_restful import Resource
from ..auth import admin_required
from .models import get_settings
from .models import edit_settings

class LdapResource(Resource):
    @admin_required
    def get(self):
        return get_settings()['ldap_settings']

    @admin_required
    def post(self):
        new_ldap_settings = request.json
        with edit_settings() as settings:
            settings['ldap_settings'] = new_ldap_settings
        return settings['ldap_settings']
