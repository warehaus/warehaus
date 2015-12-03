import httplib
from flask import request
from flask import abort as flask_abort
from flask.json import jsonify

def register_resource(app_or_blueprint, model, url_prefix='',
                      create=False, create_decorators=[], create_hook=lambda x: x,
                      read=False, read_single=False, read_decorators=[], read_hook=lambda x: x,
                      update=False, update_single=False, update_decorators=[], update_hook=lambda x: x,
                      delete=False, delete_single=False, delete_decorators=[], delete_hook=lambda x: x):
    def do_create():
        obj = model(**request.json)
        obj.save()
        return jsonify(create_hook(obj.as_dict())), httplib.CREATED

    def do_read_all():
        return jsonify(dict(objects=tuple(read_hook(obj.as_dict()) for obj in model.query.all())))

    def do_read_single(id):
        obj = model.query.get(id)
        if obj is None:
            flask_abort(httplib.NOT_FOUND)
        return jsonify(read_hook(obj.as_dict()))

    def do_update_single(id):
        obj = model.query.get(id)
        if obj is None:
            flask_abort(httplib.NOT_FOUND)
        obj.update(**request.json)
        obj.save()
        return jsonify(update_hook(obj.as_dict())), httplib.ACCEPTED

    def do_delete_single(id):
        obj = model.query.get(id)
        if obj is None:
            flask_abort(httplib.NOT_FOUND)
        obj.delete()
        return jsonify(delete_hook(obj.as_dict())), httplib.NO_CONTENT

    for d in create_decorators:
        do_create = d(do_create)
    for d in read_decorators:
        do_read_all = d(do_read_all)
        do_read_single = d(do_read_single)
    for d in update_decorators:
        do_update_single = d(do_update_single)
    for d in delete_decorators:
        do_delete_single = d(do_delete_single)

    endpoint_prefix = model.__name__.lower() + '_'

    if create:
        app_or_blueprint.route(url_prefix, methods=['POST'], endpoint=(endpoint_prefix + 'create'))(do_create)
    if read:
        app_or_blueprint.route(url_prefix, endpoint=(endpoint_prefix + 'read'))(do_read_all)
    if read_single:
        app_or_blueprint.route(url_prefix + '/<id>', endpoint=(endpoint_prefix + 'read_single'))(do_read_single)
    if update:
        raise NotImplementedError('Bulk update is not supported')
    if update_single:
        app_or_blueprint.route(url_prefix + '/<id>', methods=['PUT'], endpoint=(endpoint_prefix + 'update_single'))(do_update_single)
    if delete:
        raise NotImplementedError('Bulk delete is not supported')
    if delete_single:
        app_or_blueprint.route(url_prefix + '/<id>', methods=['DELETE'], endpoint=(endpoint_prefix + 'delete_single'))(do_delete_single)
