import httplib
import pkg_resources
from slugify import slugify
from flask import request
from flask import Response
from flask import abort as flask_abort
from flask.json import jsonify
from ..db.times import now
from .models import Lab
from .hardware_type import HardwareType

class ServerError(Exception):
    pass

HEARTBEAT_MANDATORY_FIELDS = ('hostname', 'lab_id')
HEARTBEAT_FORBIDDEN_FIELDS = ('id', 'display_name', 'slug', 'type_key', 'status', 'last_heartbeat')
UPDATE_API_ALLOWED_FIELDS = ('cluster_id', )

class Server(HardwareType):
    TYPE_VENDOR = 'builtin'
    TYPE_NAME = 'server'

    @classmethod
    def display_name(cls):
        return 'Server'

    @classmethod
    def register_api(cls, app_or_blueprint, url_prefix):
        @app_or_blueprint.route(url_prefix + '/code/agent.py')
        def get_agent_code():
            if 'lab_id' not in request.args:
                flask_abort(httplib.BAD_REQUEST, 'Missing lab_id argument')
            agent_code = pkg_resources.resource_string(__name__, 'agent.py.txt')
            agent_code = agent_code.replace('$$LABSOME_URL$$', request.url_root)
            agent_code = agent_code.replace('$$LABSOME_INTERVAL$$', '30')
            agent_code = agent_code.replace('$$LABSOME_LAB_ID$$', request.args['lab_id'])
            return Response(agent_code, status=httplib.OK, mimetype='application/x-python')

        @app_or_blueprint.route(url_prefix + '/code/heartbeat.py')
        def get_heartbeat_code():
            heartbeat_code = pkg_resources.resource_string(__name__, 'heartbeat.py.txt')
            return Response(heartbeat_code, status=httplib.OK, mimetype='application/x-python')

        @app_or_blueprint.route(url_prefix + '/heartbeat', methods=['POST'])
        def heartbeat_call():
            info = request.json
            if any(field in info for field in HEARTBEAT_FORBIDDEN_FIELDS):
                flask_abort(httplib.BAD_REQUEST, '{} heartbeats cannot contain the following fields: {}'.format(
                    cls.__name__, ', '.join(HEARTBEAT_FORBIDDEN_FIELDS)))
            if any(field not in info for field in HEARTBEAT_MANDATORY_FIELDS):
                flask_abort(httplib.BAD_REQUEST, '{} heartbeats must contain at least the following fields: {}'.format(
                    cls.__name__, ', '.join(HEARTBEAT_MANDATORY_FIELDS)))
            lab_id = info['lab_id']
            if Lab.query.get(lab_id) is None:
                flask_abort(httplib.NOT_FOUND, 'No lab with id={!r}'.format(lab_id))
            display_name = info.pop('hostname')
            slug = slugify(display_name)
            server = cls.get_by_slug_and_lab(slug, lab_id)
            if server is None:
                server = cls.create(slug=slug, display_name=display_name, **info)
            else:
                server.update(**info)
            server.last_heartbeat = now()
            server.status = 'success' # XXX calculate this with a background job based on server.last_heartbeat
            server.save()
            return 'ok'

        def _update_server(server):
            if any(field not in UPDATE_API_ALLOWED_FIELDS for field in request.json):
                flask_abort(httplib.BAD_REQUEST, 'You can only update the following server fields: {}'.format(
                    ', '.join(UPDATE_API_ALLOWED_FIELDS)))
            server.update(**request.json)
            server.save()
            return jsonify(server.as_dict()), httplib.ACCEPTED

        @app_or_blueprint.route(url_prefix + '/<server_id>', methods=['PUT'])
        def update_server_by_id(server_id):
            server = cls.get_by_id(server_id)
            if server is None:
                flask_abort(httplib.NOT_FOUND, 'No server with id {!r}'.format(server_id))
            if server.type_key != cls.type_key():
                flask_abort(httplib.NOT_FOUND, 'No server with id {!r}'.format(server_id))
            return _update_server(server)

        @app_or_blueprint.route(url_prefix + '/<lab_slug>/<server_slug>', methods=['PUT'])
        def update_server_by_slug(lab_slug, server_slug):
            lab = Lab.get_by_slug(lab_slug)
            if lab is None:
                flask_abort(httplib.NOT_FOUND, 'Unknown lab {!r}'.format(lab_slug))
            server = cls.get_by_slug_and_lab(server_slug, lab_id)
            if server is None:
                flask_abort(httplib.NOT_FOUND, 'Unknown server {!r}'.format(server_slug))
            return _update_server(server)
