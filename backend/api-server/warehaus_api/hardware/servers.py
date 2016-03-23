import httplib
import pkg_resources
import rethinkdb as r
from urlparse import urljoin
from slugify import slugify
from flask import request
from flask import Response
from flask import abort as flask_abort
from flask_restful.reqparse import RequestParser
from ..db.times import now
from ..auth.roles import require_user
from .type_class import TypeClass
from .type_class import type_action
from .type_class import object_action
from .models import Object
from .labs import get_lab_from_type_object

class ServerError(Exception):
    pass

class Server(TypeClass):
    TYPE_VENDOR = 'builtin'
    TYPE_NAME = 'server'

    def display_name(self):
        return 'Server'

    @type_action('GET', 'agent.py')
    def get_agent_code(self, typeobj):
        cur_url = request.url
        assert cur_url.endswith('agent.py'), cur_url
        this_type_url = cur_url[:-len('agent.py')]
        agent_code = pkg_resources.resource_string(__name__, 'agent.py.txt')
        agent_code = agent_code.replace('$$WAREHAUS_HEARTBEAT_CODE_URL$$', urljoin(this_type_url, 'heartbeat.py'))
        agent_code = agent_code.replace('$$WAREHAUS_HEARTBEAT_POST_URL$$', urljoin(this_type_url, 'heartbeat'))
        agent_code = agent_code.replace('$$WAREHAUS_INTERVAL$$', '30')
        return Response(agent_code, status=httplib.OK, mimetype='application/x-python')

    @type_action('GET', 'heartbeat.py')
    def get_heartbeat_code(self, typeobj):
        heartbeat_code = pkg_resources.resource_string(__name__, 'heartbeat.py.txt')
        return Response(heartbeat_code, status=httplib.OK, mimetype='application/x-python')

    def _get_server(self, typeobj, slug):
        lab = get_lab_from_type_object(typeobj)
        servers = tuple(Object.query.filter(dict(slug=slug, parent_id=lab.id, type_id=typeobj.id)))
        if len(servers) == 0:
            server = Object(slug=slug, parent_id=lab.id, type_id=typeobj.id)
            return server
        if len(servers) == 1:
            return servers[0]
        flask_abort(httplib.CONFLICT, 'Found more than one server with slug={!r} and lab_id={!r}'.format(slug, lab.id))

    @type_action('POST', 'heartbeat')
    def heartbeat_call(self, typeobj):
        display_name = request.json['hostname']
        hw_info = request.json['hw_info']
        slug = slugify(display_name)
        server = self._get_server(typeobj, slug)
        server.display_name = display_name
        server.errors = request.json.get('errors', [])
        if 'id' in server:
            server.hw_info = r.literal(hw_info)
        else:
            server.hw_info = hw_info
        server.last_heartbeat = now()
        server.status = 'success' # XXX calculate this with a background job based on server.last_heartbeat
        server.save()
        return 'ok'

    set_cluster_pareser = RequestParser()
    set_cluster_pareser.add_argument('cluster_id', required=True)

    @object_action('PUT', 'cluster')
    def set_cluster(self, server):
        require_user()
        args = self.set_cluster_pareser.parse_args()
        server.cluster_id = args['cluster_id']
        server.save()
        return server.as_dict(), httplib.OK
