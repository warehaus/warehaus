import httplib
from slugify import slugify
from flask import request
from flask import abort as flask_abort
from flask.json import jsonify
from ..auth.roles import user_required
from .hardware_type import HardwareType
from .models import Lab

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
