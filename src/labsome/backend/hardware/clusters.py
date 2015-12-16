import httplib
from slugify import slugify
from flask import request
from flask import abort as flask_abort
from flask.json import jsonify
from ..auth.roles import user_required
from ..auth.models import User
from .hardware_type import HardwareType
from .models import Lab
from .models import Object
from .servers import Server

class Cluster(HardwareType):
    TYPE_VENDOR = 'builtin'
    TYPE_NAME = 'cluster'

    @classmethod
    def display_name(cls):
        return 'Cluster'

    @classmethod
    def allow_ownership(cls):
        return True

    @classmethod
    def register_api(cls, app_or_blueprint, url_prefix):
        @app_or_blueprint.route(url_prefix, methods=['POST'])
        @user_required
        def create_cluster():
            lab_id = request.json['lab_id']
            display_name = request.json['display_name']
            slug = slugify(display_name)
            if Lab.query.get(lab_id) is None:
                flask_abort(httplib.NOT_FOUND, 'No lab with id={!r}'.format(lab_id))
            cluster = cls.get_by_slug_and_lab(slug, lab_id)
            if cluster is not None:
                flask_abort(httplib.CONFLICT, 'Cluster slug {!r} already in use'.format(slug))
            cluster = cls.create(slug=slug, display_name=display_name, lab_id=lab_id)
            cluster.save()
            return jsonify(cluster.as_dict()), httplib.CREATED

        @app_or_blueprint.route(url_prefix + '/<cluster_id>', methods=['DELETE'])
        @user_required
        def delete_cluster(cluster_id):
            cluster = cls.get_by_id(cluster_id)
            if cluster is None:
                flask_abort(httplib.NOT_FOUND, 'No cluster with id {!r}'.format(cluster_id))
            if cluster.type_key != cls.type_key():
                flask_abort(httplib.NOT_FOUND, 'No cluster with id {!r}'.format(cluster_id))
            cluster.delete()
            return jsonify(cluster.as_dict()), httplib.NO_CONTENT

        def _get_lab(lab_slug):
            lab = Lab.get_by_slug(lab_slug)
            if lab is None:
                flask_abort(httplib.NOT_FOUND, 'Unknown lab {!r}'.format(lab_slug))
            return lab

        def _get_cluster(lab, cluster_slug):
            cluster = cls.get_by_slug_and_lab(cluster_slug, lab.id)
            if cluster is None:
                flask_abort(httplib.NOT_FOUND, 'Unknown cluster {!r}'.format(cluster_slug))
            return cluster

        @app_or_blueprint.route(url_prefix + '/<lab_slug>/<cluster_slug>/config.json')
        @user_required
        def cluster_config(lab_slug, cluster_slug):
            lab = _get_lab(lab_slug)
            cluster = _get_cluster(lab, cluster_slug)
            servers = tuple(server.as_dict() for server in Object.query.filter(
                dict(lab_id=lab.id, type_key=Server.type_key(), cluster_id=cluster.id)))
            ownerships = tuple(dict(owner_id    = ownership['owner_id'],
                                    obtained_at = ownership['obtained_at'],
                                    username    = User.query.get(ownership['owner_id'])['username'])
                               for ownership in cluster['ownerships'])
            config = dict(
                id           = cluster['id'],
                slug         = cluster['slug'],
                display_name = cluster['display_name'],
                servers      = servers,
                ownerships   = ownerships,
                lab = dict(
                    id           = lab['id'],
                    slug         = lab['slug'],
                    display_name = lab['display_name'],
                ),
            )
            return jsonify(config)
