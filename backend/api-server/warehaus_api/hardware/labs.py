import httplib
from flask import abort as flask_abort
from flask import request
from ..auth.roles import require_admin
from .type_class import TypeClass
from .type_class import object_action
from .models import ensure_unique_slug
from .models import Object
from .all_type_classes import all_type_classes

class Lab(TypeClass):
    TYPE_VENDOR = 'builtin'
    TYPE_NAME = 'lab'

    @classmethod
    def display_name(cls):
        return 'Lab'

    @object_action('POST', 'type-objects')
    def create_child_type_object(self, lab):
        slug = request.json['slug']
        # XXX switch to Marshmallow
        type_class = all_type_classes[request.json['type_key']]
        type_object = type_class.create_type_object(
            parent       = lab.get_type_object(),
            slug         = slug,
            display_name = request.json['display_name'],
        )
        return type_object.as_dict(), httplib.CREATED

    @object_action('PUT', 'name')
    def rename_lab(self, lab):
        require_admin()
        slug = request.json['slug']
        ensure_unique_slug(lab.get_parent_object(), slug)
        lab.display_name = request.json['display_name']
        lab.slug = slug
        lab.save()
        return lab, httplib.ACCEPTED

    @object_action('DELETE', '')
    def delete_lab(self, lab):
        require_admin()
        lab.delete()
        return None, httplib.NO_CONTENT

def get_lab_from_type_object(typeobj):
    '''Finds the lab object that created `typeobj`, assuming `typeobj`
    was created by `Lab().create_type_object`.
    '''
    possible_labs = tuple(Object.query.get_all(typeobj.parent_id, index='type_id'))
    if len(possible_labs) != 1:
        flask_abort(httplib.INTERNAL_SERVER_ERROR, 'Expected one lab for type_id={!r}, got: {!r}'.format(typeobj.id, possible_labs))
    return possible_labs[0]
