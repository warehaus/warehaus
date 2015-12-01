import httplib
import pkg_resources
from flask import Blueprint
from flask import request
from flask import Response
from ..db.times import now
from .models import Lab
from .models import Object

servers_api = Blueprint('servers_api', __name__)

@servers_api.route('/v1/code/agent.py')
def get_agent_code():
    agent_code = pkg_resources.resource_string(__name__, 'agent.py.txt')
    return Response(agent_code, status=httplib.OK, mimetype='application/x-python')

@servers_api.route('/v1/code/heartbeat.py')
def get_heartbeat_code():
    heartbeat_code = pkg_resources.resource_string(__name__, 'heartbeat.py.txt')
    return Response(heartbeat_code, status=httplib.OK, mimetype='application/x-python')

class ServerError(Exception):
    pass

def _first_lab():
    for lab in Lab.all():
        return lab.id
    return None

@servers_api.route('/v1/heartbeat', methods=['POST'])
def heartbeat_call():
    info = request.json
    objs = tuple(Object.filter({'name': info['name']}))
    if len(objs) == 0:
        obj = Object(**info)
        obj.type = 'server'
        obj.lab_id = _first_lab()
    elif len(objs) == 1:
        [obj] = objs
        obj.update(**info)
    else:
        raise ServerError('Found more than one server object with hostname={!r}'.format(info['name']))
    obj.last_heartbeat = now()
    obj.status = 'success' # XXX calculate this with a background job based on obj.last_heartbeat
    obj.save()
    return 'ok'
