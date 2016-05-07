import json
from datetime import datetime
from flask import Flask
from flask import make_response
from flask_restful import Api
from .logs import log_to_console
from .db import init_db
from .settings import database_config
from .settings import full_config
from .auth import init_auth
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

def app_routes(app):
    api = init_api(app)
    app.config['BUNDLE_ERRORS'] = True
    api.add_resource(ObjectTreeRoot, '/api/v1/labs',             methods=['GET', 'POST'])
    api.add_resource(ObjectTreeNode, '/api/v1/labs/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])

def create_app():
    app = Flask(__name__)
    app.config.from_object(database_config())
    with app.app_context():
        init_db(app)
        app.config.from_object(full_config())
        init_auth(app)
        app_routes(app)
    return app

def create_app_with_console_logging():
    log_to_console()
    return create_app()
