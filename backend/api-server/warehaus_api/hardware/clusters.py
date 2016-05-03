import httplib
from slugify import slugify
from flask import abort as flask_abort
from flask_restful.reqparse import RequestParser
from flask_jwt import current_identity
from ..auth.roles import require_user
from ..auth.roles import roles
from ..auth.models import User
from ..db.times import now
from ..events.models import create_event
from .models import Object
from .models import create_object
from .models import get_user_attributes
from .models import ensure_unique_slug
from .type_class import TypeClass
from .type_class import type_action
from .type_class import object_action
from .labs import get_lab_from_type_object
from .servers import server_config

class Cluster(TypeClass):
    TYPE_VENDOR = 'builtin'
    TYPE_NAME = 'cluster'
    USER_CONTROLLABLE = True

    @classmethod
    def display_name(cls):
        return 'Cluster'

    @classmethod
    def description(cls):
        return ('A cluster can gather multiple servers together. ' +
                'This is useful to change ownership in bulk and ' +
                'get the configuration of all servers in the ' +
                'cluster with one API call.')

    create_cluster_parser = RequestParser()
    create_cluster_parser.add_argument('display_name', required=True)

    @type_action('POST', '')
    def create_cluster(self, typeobj):
        require_user()
        lab = get_lab_from_type_object(typeobj)
        args = self.create_cluster_parser.parse_args()
        slug = slugify(args['display_name'])
        ensure_unique_slug(lab, slug)
        cluster = create_object(slug=slug, display_name=args['display_name'], parent=lab, type=typeobj)
        cluster.save()
        create_event(
            obj_id = cluster.id,
            user_id = current_identity.id,
            interested_ids = [cluster.id, lab.id],
            title = 'Created **{}** {}'.format(cluster.display_name, typeobj.display_name['singular']),
        )
        return cluster.as_dict(), httplib.CREATED

    @object_action('DELETE', '')
    def delete_cluster(self, cluster):
        require_user()
        lab = cluster.get_parent_object()
        typeobj = cluster.get_type_object()
        cluster_id = cluster.id
        cluster.delete()
        create_event(
            obj_id = cluster_id,
            user_id = current_identity.id,
            interested_ids = [cluster_id, lab.id],
            title = 'Deleted **{}** {}'.format(cluster.display_name, typeobj.display_name['singular']),
        )
        return cluster.as_dict(), httplib.NO_CONTENT

    add_owner_parser = RequestParser()
    add_owner_parser.add_argument('username', required=True)

    @object_action('POST', 'owner')
    def add_owner(self, cluster):
        require_user()
        lab = cluster.get_type_object()
        args = self.add_owner_parser.parse_args()
        new_owner = User.get_by_username(args['username'])
        if new_owner is None:
            flask_abort(httplib.BAD_REQUEST, 'Cannot find a user with username={!r}'.format(args['username']))
        if 'ownerships' in cluster and cluster['ownerships']:
            for ownership in cluster['ownerships']:
                if ownership['owner_id'] == new_owner['id']:
                    return ownership
            flask_abort(httplib.CONFLICT, 'Cluster is already owned by someone else')
        cluster.ownerships = [dict(owner_id=new_owner['id'], obtained_at=now())]
        cluster.save()
        create_event(
            obj_id = cluster.id,
            user_id = current_identity.id,
            interested_ids = [cluster.id, lab.id],
            title = ('**{}** took **{}**'.format(new_owner.display_name, cluster.display_name)
                     if new_owner.id == current_identity.id else
                     '**{}** gave **{}** to **{}**'.format(current_identity.display_name, cluster.display_name, new_owner.display_name)),
        )
        return cluster.ownerships, httplib.CREATED

    @object_action('DELETE', 'owner')
    def remove_owner(self, cluster):
        require_user()
        lab = cluster.get_parent_object()
        if 'ownerships' not in cluster:
            return None, httplib.NO_CONTENT
        if current_identity.role != roles.Admin and all(ownership['owner_id'] != current_identity.id
                                                        for ownership in cluster.ownerships):
            flask_abort(httplib.FORBIDDEN, 'You cannot remove ownerships of other users')
        cluster.ownerships = []
        cluster.save()
        create_event(
            obj_id = cluster.id,
            user_id = current_identity.id,
            interested_ids = [cluster.id, lab.id],
            title = '**{}** released **{}**'.format(current_identity.display_name, cluster.display_name),
        )
        return None, httplib.NO_CONTENT

    @object_action('GET', 'config.json')
    def cluster_config(self, cluster):
        require_user()
        lab = cluster.get_parent_object()
        servers = tuple(server_config(server) for server in Object.query.filter(
            dict(parent_id=lab.id, cluster_id=cluster.id)))
        ownerships = tuple(dict(owner_id    = ownership['owner_id'],
                                obtained_at = ownership['obtained_at'],
                                username    = User.query.get(ownership['owner_id'])['username'])
                           for ownership in cluster['ownerships']) if 'ownerships' in cluster else ()
        config = dict(
            id           = cluster['id'],
            slug         = cluster['slug'],
            display_name = cluster['display_name'],
            user_attrs   = get_user_attributes(cluster),
            servers      = servers,
            ownerships   = ownerships,
            lab = dict(
                id           = lab['id'],
                slug         = lab['slug'],
                display_name = lab['display_name'],
                user_attrs   = get_user_attributes(lab),
            ),
        )
        return config
