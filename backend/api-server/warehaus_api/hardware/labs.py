import httplib
from flask import abort as flask_abort
from flask import request
from flask_jwt import current_identity
from ..auth.roles import require_admin
from ..events.models import create_event
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
        require_admin()
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
        old_name = lab.display_name
        lab.display_name = request.json['display_name']
        lab.slug = slug
        lab.save()
        create_event(
            obj_id = lab.id,
            user_id = current_identity.id,
            interested_ids = [lab.id],
            title = 'Renamed **{}** to **{}**'.format(old_name, lab.display_name),
        )
        return lab, httplib.ACCEPTED

    @object_action('DELETE', '')
    def delete_lab(self, lab):
        require_admin()
        lab_id = lab.id
        lab.delete()
        create_event(
            obj_id = lab_id,
            user_id = current_identity.id,
            interested_ids = [lab_id],
            title = 'Deleted the **{}** lab'.format(lab.display_name),
        )
        return None, httplib.NO_CONTENT

def get_lab_from_type_object(typeobj):
    '''Finds the lab object that created `typeobj`, assuming `typeobj`
    was created by `Lab().create_type_object`.
    '''
    error = 'Found more than one lab for type_id={!r}'.format(typeobj.id)
    return Object.query.get_exactly_one(typeobj.parent_id, index='type_id', error=error)
