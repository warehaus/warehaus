from flask import request
from flask import current_app
from flask_restful import Resource
from flask_jwt import _jwt_required
from flask_jwt import JWTError
from ..auth import admin_required
from .models import get_settings
from .models import edit_settings

class LDAP(Resource):
    @admin_required
    def get(self):
        return get_settings()['ldap_settings']

    @admin_required
    def post(self):
        new_ldap_settings = request.json
        with edit_settings() as settings:
            settings['ldap_settings'] = new_ldap_settings
        return settings['ldap_settings']

class State(Resource):
    def get(self):
        is_initialized = False
        is_authenticated = False
        if get_settings().is_initialized:
            is_initialized = True
            try:
                # This refreshes current_identity, raises JWTError if no token exists
                _jwt_required(current_app.config['JWT_DEFAULT_REALM'])
            except JWTError:
                pass
            else:
                is_authenticated = True
        return dict(is_initialized=is_initialized, is_authenticated=is_authenticated)
