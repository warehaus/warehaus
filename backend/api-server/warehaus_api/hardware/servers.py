import httplib
import pkg_resources
import rethinkdb as r
from logging import getLogger
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

logger = getLogger(__name__)

class ServerError(Exception):
    pass

class PciDevice(TypeClass):
    SLUG = 'pci-device'
    TYPE_VENDOR = 'builtin'
    TYPE_NAME = 'server-' + SLUG

    @classmethod
    def display_name(cls):
        return dict(singular='PCI Device', plural='PCI Devices')

class NetworkInterface(TypeClass):
    SLUG = 'network-interface'
    TYPE_VENDOR = 'builtin'
    TYPE_NAME = 'server-' + SLUG

    @classmethod
    def display_name(cls):
        return dict(singular='Network Interface', plural='Network Interfaces')

class Disk(TypeClass):
    SLUG = 'disk'
    TYPE_VENDOR = 'builtin'
    TYPE_NAME = 'server-' + SLUG

    @classmethod
    def display_name(cls):
        return dict(singular='Disk', plural='Disks')

class Server(TypeClass):
    TYPE_VENDOR = 'builtin'
    TYPE_NAME = 'server'

    @classmethod
    def display_name(cls):
        return 'Server'

    def subtypes(self):
        return {typeclass.SLUG: typeclass() for typeclass in (PciDevice, NetworkInterface, Disk)}

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
        servers = tuple(Object.query.filter(dict(slug=slug, parent_id=lab.id)))
        if len(servers) == 0:
            server = Object(slug=slug, parent_id=lab.id, type_id=typeobj.id)
            return server
        if len(servers) == 1:
            server = servers[0]
            if server.type_id != typeobj.id:
                flask_abort(httplib.INTERNAL_SERVER_ERROR, 'Found server for heartbeat with slug={!r} parent_id={!r} but type_id={!r} (expected type_id={!r})'.format(
                    server.slug, server.parent_id, server.type_id, typeobj.id))
            return server
        flask_abort(httplib.CONFLICT, 'Found more than one server with slug={!r} and lab_id={!r}'.format(slug, lab.id))

    def _sync_sub_objects(self, server, subtype, last_updated):
        '''Query for all subobjects with type `subtype` of the `server`.
        The `last_updated` is a `dict` of `slug -> fields`. If `slug`
        doesn't exist, it's created with the desired `fields`. If it
        exists, the current object is updated. If a subobject exists but
        not found in `last_updated` it's removed from the `server`.
        '''
        existing = {subobj.slug: subobj for subobj in Object.query.filter(dict(parent_id=server.id, type_id=subtype.id))}
        for slug, expected_fields in last_updated.iteritems():
            if slug in existing:
                subobj = existing[slug]
                subobj.update(**expected_fields)
                subobj.save()
            else:
                subobj = Object(parent_id=server.id, type_id=subtype.id, slug=slug)
                subobj.update(**expected_fields)
                subobj.save()
        for slug_to_delete in (set(existing) - set(last_updated)):
            existing[slug_to_delete].delete()

    def _update_sub_objects(self, server, typeobj, hw_info):
        self._sync_sub_objects(server, typeobj.get_object_child(PciDevice.SLUG),
                               {('pci-' + pcidev['address']): pcidev for pcidev in hw_info.get('pci_devices', [])})
        self._sync_sub_objects(server, typeobj.get_object_child(NetworkInterface.SLUG),
                               {('net-' + net['dev']): net for net in hw_info.get('net', [])})
        self._sync_sub_objects(server, typeobj.get_object_child(Disk.SLUG),
                               {('disk-' + disk['name']): disk for disk in hw_info.get('disks', [])})

    @type_action('POST', 'heartbeat')
    def heartbeat_call(self, typeobj):
        display_name = request.json['hostname']
        logger.info('Processing heartbeat from {!r}'.format(request.headers.getlist("X-Forwarded-For")[0] if request.headers.getlist("X-Forwarded-For") else request.remote_addr))
        hw_info = request.json['hw_info']
        slug = slugify(display_name)
        server = self._get_server(typeobj, slug)
        server.display_name = display_name
        server.errors = request.json.get('errors', [])
        # Update/keep hw_info in the server object. We always keep
        # a copy of the last keepalive even after creating sub-objects
        # from it.
        if 'id' in server:
            server.hw_info = r.literal(hw_info)
        else:
            server.hw_info = hw_info
        server.last_seen = now()
        server.status = 'success' # XXX calculate this with a background job based on server.last_seen
        server.save()
        self._update_sub_objects(server, typeobj, hw_info)
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
