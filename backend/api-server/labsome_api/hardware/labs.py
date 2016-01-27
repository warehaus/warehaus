import httplib
from flask import abort as flask_abort
from flask import request
from ..auth.roles import require_admin
from .type_class import TypeClass
from .type_class import object_action
from .models import Object

class Lab(TypeClass):
    TYPE_VENDOR = 'builtin'
    TYPE_NAME = 'lab'

    def display_name(self):
        return 'Lab'

    @object_action('POST', 'type-objects')
    def create_type_object(self, lab):
        slug = request.json['slug']
        ensure_unique_slug(lab.type_id, slug)
        # XXX switch to Marshmallow
        type_object = Object(
            type_id      = None,
            parent_id    = lab.type_id,
            slug         = slug,
            type_key     = request.json['type_key'],
            display_name = request.json['display_name'],
        )
        type_object.save()
        return type_object.as_dict(), httplib.CREATED

    @object_action('DELETE', '')
    def delete_lab(self, lab):
        require_admin()
        lab.delete()
        return None, httplib.NO_CONTENT

def get_lab_from_type_object(typeobj):
    '''Finds the lab object that created `typeobj`, assuming `typeobj`
    was created by `Lab.create_type_object`.
    '''
    possible_labs = tuple(Object.query.filter(dict(type_id=typeobj.parent_id)))
    if len(possible_labs) != 1:
        flask_abort(httplib.INTERNAL_SERVER_ERROR, 'Expected one lab for type_id={!r}, got: {!r}'.format(typeobj.id, possible_labs))
    return possible_labs[0]

def ensure_unique_slug(parent_id, slug):
    '''Makes sure the `slug` is unique as a child of `parent_obj`'''
    if any(Object.query.filter(dict(parent_id=parent_id, slug=slug))):
        flask_abort(httplib.CONFLICT, 'Slug {!r} already in use in {!r}'.format(slug, parent_id))
