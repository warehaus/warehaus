import httplib
from logging import getLogger
from flask import abort as flask_abort
from .. import db

logger = getLogger(__name__)

TREE_ROOT = 'ROOT'
NO_TYPE = 'NO_TYPE'

class Object(db.Model):
    _allow_additional_items = True

    slug = db.Field()
    type_id = db.Field(default=NO_TYPE) # Points to Object
    parent_id = db.Field(default=TREE_ROOT) # Points to Object

    def has_type(self):
        return self.type_id != NO_TYPE

    def get_parent_object(self):
        if self.parent_id == TREE_ROOT:
            return None
        return Object.query.get(self.parent_id)

    def get_type_object(self):
        # Calls global function
        return get_type_object(self)

    def get_object_child(self, child_slug):
        # Calls global function
        return get_object_child(self, child_slug)

    def get_children_with_slug(self, slug):
        return Object.query.get_all([slug, self.id], index='slug_parent')

    def get_children_with_subtype(self, subtype):
        if not isinstance(subtype, Object):
            raise TypeError('subtype argument must be of Object instance')
        return Object.query.get_all([self.id, subtype.id], index='parent_type')

def create_object(**kwargs):
    if 'parent_id' in kwargs:
        raise TypeError("You can't pass 'parent_id' to create_object(). Please use 'parent' argument only")
    if 'type_id' in kwargs:
        raise TypeError("You can't pass 'type_id' to create_object(). Please use 'type' argument only")
    if 'slug' not in kwargs:
        raise TypeError("New Objects must have a slug attribute")
    def _get_id_from_arg(key, default):
        arg = kwargs.pop(key, None)
        if arg is None:
            return default
        if isinstance(arg, Object):
            return arg.id
        raise TypeError('{} argument must be an instance of Object'.format(arg))
    return Object(parent_id=_get_id_from_arg('parent', TREE_ROOT), type_id=_get_id_from_arg('type', NO_TYPE), **kwargs)

def get_object_by_id(obj_id):
    assert obj_id != TREE_ROOT
    assert obj_id != NO_TYPE
    obj = Object.query.get(obj_id)
    if obj is None:
        flask_abort(httplib.NOT_FOUND, 'Could not find object with id={!r}'.format(obj_id))
    return obj

def get_type_object(obj):
    '''Finds and returns the type object of `obj`. If `obj` doesn't
    have a type object or the type object is not found, `None` is returned.
    '''
    if obj is None:
        logger.debug('  get_type_object(obj=None)')
        return None
    logger.debug('  get_type_object(obj.id={!r}, obj.type_id={!r})'.format(obj.id, obj.type_id))
    if obj.type_id == NO_TYPE:
        return None
    return Object.query.get(obj.type_id)

def get_object_child(parent, child_slug):
    '''Finds the child of `parent` named `child_slug`. If no child is found
    `None` is returned. If more than one child is found this function fails
    the request with `INTERNAL_SERVER_ERROR`.
    '''
    parent_id = TREE_ROOT if parent is None else parent.id
    logger.debug('  get_object_child(parent_id={!r}, child_slug={!r})'.format(parent_id, child_slug))
    error = 'Got multiple results for slug={!r} parent_id={!r}'.format(child_slug, parent_id)
    return Object.query.get_one_or_none([child_slug, parent_id], index='slug_parent', error=error)

def get_objects_of_type(typeobj):
    '''Returns all objects of type `typeobj`.'''
    type_id = NO_TYPE if typeobj is None else typeobj.id
    return Object.query.get_all(type_id, index='type_id')

def get_object_children(obj):
    '''Returns an iterator for all children of an object.'''
    obj_id = TREE_ROOT if obj is None else obj.id
    return Object.query.get_all(obj_id, index='parent_id')

def ensure_unique_slug(parent, slug):
    '''Makes sure the `slug` is unique as a child of `parent`. If
    `slug` is not unique, we abort with `httplib.CONFLICT`.
    '''
    parent_id = parent.id if parent is not None else TREE_ROOT
    if any(Object.query.get_all([slug, parent_id], index='slug_parent')):
        flask_abort(httplib.CONFLICT, 'Slug "{}" already in use in "{}"'.format(slug, parent_id))

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
