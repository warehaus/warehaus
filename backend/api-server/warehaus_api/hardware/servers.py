import httplib
import pkg_resources
import rethinkdb as r
from logging import getLogger
from urlparse import urljoin
from functools import partial
from slugify import slugify
from flask import request
from flask import Response
from flask import abort as flask_abort
from flask_restful.reqparse import RequestParser
from flask_jwt import current_identity
from ..db.times import now
from ..auth.roles import require_user
from ..events.models import create_event
from .type_class import TypeClass
from .type_class import type_action
from .type_class import object_action
from .models import Object
from .models import create_object
from .models import get_user_attributes
from .models import get_object_by_id
from .models import get_object_children
from .models import get_object_child
from .models import get_type_object
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
    USER_CONTROLLABLE = True

    @classmethod
    def display_name(cls):
        return 'Server'

    @classmethod
    def description(cls):
        return ('A physical or virtual machine that will be monitored with an agent. ' +
                'The agent in installed on the machine as a service and reports back ' +
                'the status of the machine to Warehaus.')

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
        servers = tuple(lab.get_children_with_slug(slug))
        if len(servers) == 0:
            server = create_object(slug=slug, parent=lab, type=typeobj)
            return server, lab
        if len(servers) == 1:
            server = servers[0]
            if server.type_id != typeobj.id:
                flask_abort(httplib.INTERNAL_SERVER_ERROR, 'Found server for heartbeat with slug={!r} parent_id={!r} but type_id={!r} (expected type_id={!r})'.format(
                    server.slug, server.parent_id, server.type_id, typeobj.id))
            return server, lab
        flask_abort(httplib.CONFLICT, 'Found more than one server with slug={!r} and lab_id={!r}'.format(slug, lab.id))

    def _get_pci_provider_info(self, agent_info, pci_device):
        pass

    def _get_net_provider_info(self, agent_info, net_if):
        if agent_info.get('provider_info', {}).get('provider', None) == 'aws':
            info = agent_info['provider_info'].get('network', {}).get('interfaces', {}).get('macs', {}).get(net_if['mac'], None)
            if info is not None:
                info['provider'] = 'aws'
                return info

    def _get_disk_provider_info(self, agent_info, disk):
        pass

    def _sync_sub_objects(self, server, subtype, get_provider_info_func, last_update):
        '''Query for all subobjects with type `subtype` of the `server`.
        The `last_update` is a `dict` of `slug -> fields`. If `slug`
        doesn't exist, it's created with the desired `fields`. If it
        exists, the current object is updated. If a subobject exists but
        not found in `last_update` it's removed from the `server`.
        '''
        existing = {subobj.slug: subobj for subobj in server.get_children_with_subtype(subtype)}
        for slug, expected_fields in last_update.iteritems():
            if slug in existing:
                subobj = existing[slug]
                subobj.update(**expected_fields)
            else:
                subobj = create_object(parent=server, type=subtype, slug=slug)
                subobj.update(**expected_fields)
            provider_info = get_provider_info_func(subobj)
            if 'id' in subobj:
                subobj.provider = r.literal(provider_info)
            else:
                subobj.provider = provider_info
            subobj.save()
        for slug_to_delete in (set(existing) - set(last_update)):
            existing[slug_to_delete].delete()

    def _update_sub_objects(self, server, typeobj, agent_info):
        self._sync_sub_objects(server, typeobj.get_object_child(PciDevice.SLUG),
                               partial(self._get_pci_provider_info, agent_info),
                               {('pci-' + pcidev['address']): pcidev for pcidev in agent_info.get('hw_pci_devices', [])})
        self._sync_sub_objects(server, typeobj.get_object_child(NetworkInterface.SLUG),
                               partial(self._get_net_provider_info, agent_info),
                               {('net-' + net['dev']): net for net in agent_info.get('hw_net', [])})
        self._sync_sub_objects(server, typeobj.get_object_child(Disk.SLUG),
                               partial(self._get_disk_provider_info, agent_info),
                               {('disk-' + disk['name']): disk for disk in agent_info.get('hw_disks', [])})

    @type_action('POST', 'heartbeat')
    def heartbeat_call(self, typeobj):
        display_name = request.json['hostname']
        logger.info('Processing heartbeat from {!r}'.format(request.headers.getlist("X-Forwarded-For")[0] if request.headers.getlist("X-Forwarded-For") else request.remote_addr))
        agent_info = request.json['info']
        slug = slugify(display_name)
        server, lab = self._get_server(typeobj, slug)
        server.display_name = display_name
        server.errors = request.json.get('errors', [])
        # Update/keep agent_info in the server object. We always keep
        # a copy of the last keepalive even after creating sub-objects
        # from it.
        is_new = 'id' not in server
        if is_new:
            server.agent_info = agent_info
        else:
            server.agent_info = r.literal(agent_info)
        server.last_seen = now()
        server.status = 'online'
        server.save()
        self._update_sub_objects(server, typeobj, agent_info)
        if is_new:
            create_event(
                obj_id = server.id,
                user_id = None,
                interested_ids = [server.id, lab.id],
                title = 'Created **{}** {}'.format(server.display_name, typeobj.display_name['singular']),
            )
        return 'ok'

    set_cluster_pareser = RequestParser()
    set_cluster_pareser.add_argument('cluster_id', required=True)

    @object_action('PUT', 'cluster')
    def set_cluster(self, server):
        require_user()
        args = self.set_cluster_pareser.parse_args()
        lab = server.get_parent_object()
        previous_cluster_id = server.cluster_id if 'cluster_id' in server else None
        server.cluster_id = args['cluster_id']
        server.save()
        if previous_cluster_id is not None or server.cluster_id is not None:
            if previous_cluster_id is not None:
                previous_cluster = get_object_by_id(previous_cluster_id)
            if server.cluster_id is not None:
                cluster = get_object_by_id(server.cluster_id)
            create_event(
                obj_id = server.id,
                user_id = current_identity.id,
                interested_ids = [server.id, lab.id] + [some_id for some_id in (previous_cluster_id, server.cluster_id) if some_id is not None],
                title = ('Added **{}** to **{}**'.format(server.display_name, cluster.display_name)
                         if previous_cluster_id is None else
                         'Removed **{}** from **{}**'.format(server.display_name, cluster.display_name)
                         if server.cluster_id is None else
                         'Moved **{}** from **{}** to **{}**'.format(server.display_name, previous_cluster.display_name)),
            )
        return server.as_dict(), httplib.OK

    @object_action('GET', 'config.json')
    def server_config(self, server):
        require_user()
        return server_config(server)

def server_config(server):
    typeobj = get_type_object(server)
    net_if_type = get_object_child(typeobj, NetworkInterface.SLUG)
    pci_dev_type = get_object_child(typeobj, PciDevice.SLUG)
    disk_type = get_object_child(typeobj, Disk.SLUG)
    hw = dict(
        cpu  = server['agent_info']['hw_cpu'],
        mem  = server['agent_info']['hw_mem'],
        fs   = server['agent_info']['hw_fs'],
        net  = [],
        pci  = [],
        disk = [],
    )
    for childobj in get_object_children(server):
        childobj_data = childobj.as_dict()
        childobj_data['user_attrs'] = get_user_attributes(childobj)
        if childobj.type_id == net_if_type.id:
            hw['net'].append(childobj_data)
        elif childobj.type_id == pci_dev_type.id:
            hw['pci'].append(childobj_data)
        elif childobj.type_id == disk_type.id:
            hw['disk'].append(childobj_data)
    config = dict(
        id           = server['id'],
        type_id      = server['type_id'],
        slug         = server['slug'],
        display_name = server['display_name'],
        user_attrs   = get_user_attributes(server),
        provider     = server['agent_info']['provider_info'],
        hw           = hw,
    )
    return config
