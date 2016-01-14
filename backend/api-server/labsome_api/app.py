import os
import sys
import json
from datetime import datetime
from flask import jsonify
from flask import make_response
from flask_jwt import _jwt_required
from flask_jwt import JWTError
from flask_restful import Api
from .logs import log_to_console
from .base_app import create_base_app
from .settings.models import get_settings
from . import auth
from .first_setup.api import first_setup_api
from .auth.resources import CurrentUser
from .settings.resources import LdapResource
from .auth.resources import AllUsers
from .auth.resources import SingleUser
from .auth.resources import UserTokens
from .hardware.resources import AllLabs
from .hardware.resources import SingleLab
from .hardware.resources import AllObjects
from .hardware.resources import SingleObject
from .hardware.resources import Types
from .hardware.api import hardware_api

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return str(obj)
        return json.JSONEncoder.default(self, obj)

def _state_api(app):
    @app.route('/api/state')
    def server_state():
        is_initialized = False
        is_authenticated = False
        if get_settings().is_initialized:
            is_initialized = True
            try:
                _jwt_required(app.config['JWT_DEFAULT_REALM']) # Refreshes current_identity, raises JWTError if no token exists
            except JWTError:
                pass
            else:
                is_authenticated = True
        return jsonify(dict(is_initialized=is_initialized, is_authenticated=is_authenticated))

def _first_setup_routes(app):
    app.register_blueprint(first_setup_api, url_prefix='/api/first-setup')

def _full_app_routes(app):
    api = Api(app)

    @api.representation('application/json')
    def output_json(data, code, headers=None):
        resp = make_response(json.dumps(data, cls=CustomJSONEncoder), code)
        resp.headers.extend(headers or {})
        return resp

    # Settings resources
    api.add_resource(LdapResource, '/api/settings/v1/ldap',                   methods=['GET', 'POST'])

    # Auth resources
    api.add_resource(CurrentUser,  '/api/auth/v1/self',                       methods=['GET'])
    api.add_resource(AllUsers,     '/api/auth/v1/users',                      methods=['GET', 'POST'])
    api.add_resource(SingleUser,   '/api/auth/v1/users/<user_id>',            methods=['GET', 'PUT', 'DELETE'])
    api.add_resource(UserTokens,   '/api/auth/v1/users/<user_id>/api-tokens', methods=['POST', 'DELETE'])

    # Hardware resources
    api.add_resource(AllLabs,      '/api/hardware/v1/labs',                   methods=['GET', 'POST'])
    api.add_resource(SingleLab,    '/api/hardware/v1/labs/<lab_id>',          methods=['GET', 'PUT', 'DELETE'])
    api.add_resource(AllObjects,   '/api/hardware/v1/objects',                methods=['GET'])
    api.add_resource(SingleObject, '/api/hardware/v1/objects/<obj_id>',       methods=['GET'])
    api.add_resource(Types,        '/api/hardware/v1/types',                  methods=['GET'])

    app.register_blueprint(hardware_api, url_prefix='/api/hardware/v1')

def create_api(app):
    _state_api(app)
    if get_settings().is_initialized:
        _full_app_routes(app)
    else:
        _first_setup_routes(app)

def create_app():
    log_to_console()
    app = create_base_app()
    with app.app_context():
        auth.init_app(app)
        create_api(app)
    return app
