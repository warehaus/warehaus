import httplib
from flask import request
from flask import abort as flask_abort
from flask.json import jsonify
from .hardware_type import HardwareType
from .models import Lab

class Cluster(HardwareType):
    TYPE_VENDOR = 'builtin'
    TYPE_NAME = 'cluster'

    @classmethod
    def display_name(cls):
        return 'Cluster'

    @classmethod
    def register_api(cls, app_or_blueprint, url_prefix):
        @app_or_blueprint.route(url_prefix, methods=['POST'])
        def create_cluster():
            lab_id = request.json['lab_id']
            name = request.json['name']
            if Lab.query.get(lab_id) is None:
                flask_abort(httplib.NOT_FOUND, 'No lab with id={!r}'.format(lab_id))
            cluster = cls.get_by_name_and_lab(name, lab_id)
            if cluster is not None:
                flask_abort(httplib.CONFLICT, 'Cluster name already in use')
            cluster = cls.create(name=name, lab_id=lab_id)
            cluster.save()
            return jsonify(cluster.as_dict()), httplib.CREATED

        @app_or_blueprint.route(url_prefix + '/<cluster_id>', methods=['DELETE'])
        def delete_cluster(cluster_id):
            cluster = cls.get_by_id(cluster_id)
            if cluster is None:
                flask_abort(httplib.NOT_FOUND, 'No cluster with id {!r}'.format(cluster_id))
            if cluster.type_key != cls.type_key():
                flask_abort(httplib.NOT_FOUND, 'No cluster with id {!r}'.format(cluster_id))
            cluster.delete()
            return jsonify(cluster.as_dict()), httplib.NO_CONTENT
