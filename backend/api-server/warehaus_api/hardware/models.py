import httplib
from logging import getLogger
from flask import abort as flask_abort
from .. import db

logger = getLogger(__name__)

class Object(db.Model):
    _allow_additional_items = True

    slug = db.Field(db.Index(),
                    db.IndexWith('slug_parent', ['parent_id']),
                    db.IndexWith('slug_type', ['type_id']),
                    db.IndexWith('slug_type_parent', ['type_id', 'parent_id']))
    type_id = db.Field(db.Index(), default=None) # Points to Object
    parent_id = db.Field(db.Index(), default=None) # Points to Object

    def get_type_object(self):
        # Calls global function
        return get_type_object(self)

    def get_object_child(self, child_slug):
        # Calls global function
        return get_object_child(self, child_slug)

def get_type_object(obj):
    '''Finds and returns the type object of `obj`. If `obj` doesn't
    have a type object or the type object is not found, `None` is returned.
    '''
    if obj is None:
        logger.debug('  get_type_object(obj=None)')
        return None
    logger.debug('  get_type_object(obj.id={!r}, obj.type_id={!r})'.format(obj.id, obj.type_id))
    if obj.type_id is None:
        return None
    return Object.query.get(obj.type_id)

def get_object_child(parent, child_slug):
    '''Finds the child of `parent` named `child_slug`. If no child is found
    `None` is returned. If more than one child is found this function fails
    the request with `INTERNAL_SERVER_ERROR`.
    '''
    parent_id = None if parent is None else parent.id
    logger.debug('  get_object_child(parent_id={!r}, child_slug={!r})'.format(parent_id, child_slug))
    possible_objs = tuple(Object.query.filter(lambda obj: (obj['slug'] == child_slug) & (obj['parent_id'] == parent_id)))
    if len(possible_objs) == 0:
        return None
    if len(possible_objs) == 1:
        return possible_objs[0]
    flask_abort(httplib.INTERNAL_SERVER_ERROR, 'Got multiple results for slug={!r} parent_id={!r}'.format(child_slug, parent_id))

def get_objects_of_type(typeobj):
    '''Returns all objects of type `typeobj`.'''
    return Object.query.filter(dict(type_id=typeobj.id))

def get_object_children(obj):
    '''Returns an iterator for all children of an object.'''
    return Object.query.filter(dict(parent_id=obj.id))

def get_user_attributes(obj):
    '''Gets user attributes defined in the type object of `obj` and
    returns all attributes with the value as defined in `obj` or with
    `None` to indicate no value.
    '''
    typeobj = get_type_object(obj)
    if typeobj is None:
        return {}
    if 'attrs' not in typeobj:
        return {}
    return {attr['slug']: (None if 'attrs' not in obj else obj.attrs.get(attr['slug'], None))
            for attr in typeobj.attrs}
