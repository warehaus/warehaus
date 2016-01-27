import os
import sys
import json
import httplib
from datetime import datetime
from flask import jsonify
from flask import make_response
from flask_restful import Api
from .logs import log_to_console
from .base_app import create_base_app
from .settings.models import get_settings
from .first_setup.api import first_setup_api
from .auth import init_auth
from .auth.resources import CurrentUser
from .auth.resources import AllUsers
from .auth.resources import SingleUser
from .auth.resources import UserTokens
from .settings.resources import LDAP
from .settings.resources import State
from .hardware.resources import RawObjects
from .hardware.resources import RawObject
from .hardware.resources import TypeClasses
from .hardware.resources import ObjectTreeRoot
from .hardware.resources import ObjectTreeNode

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return str(obj)
        return json.JSONEncoder.default(self, obj)

def init_api(app):
    api = Api(app)
    @api.representation('application/json')
    def output_json(data, code, headers=None):
        resp = make_response(json.dumps(data, cls=CustomJSONEncoder), code)
        resp.headers.extend(headers or {})
        return resp
    return api

def first_setup_routes(app):
    app.register_blueprint(first_setup_api, url_prefix='/api/v1/first-setup')

def app_routes(app):
    api = init_api(app)
    app.config['BUNDLE_ERRORS'] = True
    # Settings resources
    api.add_resource(State, '/api/v1/state',         methods=['GET'])
    api.add_resource(LDAP,  '/api/v1/settings/ldap', methods=['GET', 'POST'])
    # Auth resources
    api.add_resource(CurrentUser, '/api/v1/auth/self',                       methods=['GET'])
    api.add_resource(AllUsers,    '/api/v1/auth/users',                      methods=['GET', 'POST'])
    api.add_resource(SingleUser,  '/api/v1/auth/users/<user_id>',            methods=['GET', 'PUT', 'DELETE'])
    api.add_resource(UserTokens,  '/api/v1/auth/users/<user_id>/api-tokens', methods=['POST', 'DELETE'])
    # Hardware resources
    api.add_resource(RawObjects,  '/api/v1/hardware/objects',          methods=['GET'])
    api.add_resource(RawObject,   '/api/v1/hardware/objects/<obj_id>', methods=['GET'])
    api.add_resource(TypeClasses, '/api/v1/hardware/types',            methods=['GET'])
    # Labs resources
    api.add_resource(ObjectTreeRoot, '/api/v1/labs',             methods=['GET', 'POST'])
    api.add_resource(ObjectTreeNode, '/api/v1/labs/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])

def create_app(**config):
    app = create_base_app()
    app.config.update(**config)
    with app.app_context():
        init_auth(app)
        app_routes(app)
        if not get_settings().is_initialized:
            first_setup_routes(app)
    return app

def create_app_with_console_logging(**config):
    log_to_console()
    return create_app(**config)
