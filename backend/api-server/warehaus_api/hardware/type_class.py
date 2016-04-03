import re
import httplib
from logging import getLogger
from flask import request
from flask import abort as flask_abort
from ..auth.roles import require_user
from ..auth.roles import require_admin
from .models import Object

logger = getLogger(__name__)

OBJ_ACTION_ATTR = '_warehaus_object_action'
TYPE_ACTION_ATTR = '_warehaus_type_action'

def object_action(method, name):
    '''When defined in a type `T`, this decorator creates an action which can be
    invoked on objects with type `T`.
    The `method` argument is the HTTP verb (`GET`, `POST`, etc.) and the `name`
    argument is the action name to be called through an HTTP URL. Make sure to
    keep `name` plain-ascii so that actions can be placed in URLs through command
    line.
    '''
    def decorator(func):
        setattr(func, OBJ_ACTION_ATTR, dict(method=method, name=name))
        return func
    return decorator

def type_action(method, name):
    '''Same as `object_action` but for type objects. The action can be invoked
    on type objects rather than objects.
    '''
    def decorator(func):
        setattr(func, TYPE_ACTION_ATTR, dict(method=method, name=name))
        return func
    return decorator

def get_object_action(func):
    return getattr(func, OBJ_ACTION_ATTR, None)

def get_type_action(func):
    return getattr(func, TYPE_ACTION_ATTR, None)

def ensure_unique_slug(parent_id, slug):
    '''Makes sure the `slug` is unique as a child of `parent_obj`. If
    `slug` is not unique, we abort with `httplib.CONFLICT`.
    '''
    if any(Object.query.filter(dict(parent_id=parent_id, slug=slug))):
        flask_abort(httplib.CONFLICT, 'Slug "{}" already in use in "{}"'.format(slug, parent_id))

class TypeClass(object):
    TYPE_VENDOR = None
    TYPE_NAME = None

    @classmethod
    def type_key(cls):
        '''Returns a unique `type_key` for this type class. You should
        not override this method normally.'''
        return '{}-{}'.format(cls.TYPE_VENDOR, cls.TYPE_NAME)

    @classmethod
    def display_name(cls):
        return cls.type_key()

    def create_type_object(self, parent_id, slug, display_name=None):
        display_name = display_name if display_name is not None else self.display_name()
        ensure_unique_slug(parent_id, slug)
        type_object = Object(
            type_id      = None, # Type objects have no type
            parent_id    = parent_id,
            slug         = slug,
            type_key     = self.type_key(),
            display_name = display_name,
        )
        type_object.save()
        self.ensure_subtypes(type_object)
        return type_object

    #----------------------------------------------------------------#
    # Automatic sub-type creation                                    #
    #----------------------------------------------------------------#

    def subtypes(self):
        '''A type-class can define sub-type-classes.
        A sub-type-class is a type-class that is automatically created for
        instances of the type-class. These sub-types are required for the
        type-object's normal operation and can later on be controlled and
        queried by users.

        For example, a `Server` object might need a `Disk` sub-object.
        Such a sub-type holds objects which relate to objects of type
        `Server` and the `Server` objects can't exist without their `Disk`
        sub-objects. A user might query the sub-types directly or even
        define user-defined attributes to add more information by users.

        Defining a sub-type-class would ensure the sub-types are
        automatically created when the type-object is being created. The
        type-objects can be accessed as child objects of the type object.

        This method should return a dict of the format

            {slug -> TypeClass instance}

        where `slug` will be the `slug` of the new sub type-object.
        '''
        return {}

    def ensure_subtypes(self, type_object):
        '''Creates type-class instances as defined in `sub_type_classes`.'''
        for slug, typeclass in self.subtypes().iteritems():
            typeclass.create_type_object(parent_id=type_object.id, slug=slug)

    #----------------------------------------------------------------#
    # Actions supported on all objects and type-objects              #
    #----------------------------------------------------------------#

    @object_action('GET', '')
    def get_object(self, obj):
        '''Returns the object from the database. This action is automatically
        supported for all objects of all types.
        '''
        require_user()
        return obj.as_dict()

    @type_action('GET', '')
    def get_type(self, typeobj):
        '''Same as `get_object` but for type objects.'''
        require_user()
        return typeobj.as_dict()

    @type_action('GET', 'objects')
    def get_objects_of_type(self, typeobj):
        '''Returns all objects of this type object.'''
        require_user()
        return dict(objects=list(obj.as_dict() for obj in Object.query.filter(dict(type_id=typeobj.id))))

    @type_action('GET', 'children')
    def get_type_children(self, typeobj):
        '''Get all type-objects which are children of this type-object.'''
        require_user()
        return dict(children=list(child.as_dict() for child in Object.query.filter(dict(parent_id=typeobj.id))))

    @type_action('DELETE', '')
    def delete_type(self, typeobj):
        '''Deletes this object.'''
        require_admin()
        typeobj.delete()
        return None, httplib.NO_CONTENT

    #----------------------------------------------------------------#
    # User-based attribute support                                   #
    #----------------------------------------------------------------#

    @type_action('POST', 'attrs')
    def add_attribute(self, typeobj):
        '''Add an attribute to this type-object. After this attribute has been
        added, users can get/set this attribute from all objects of this type.
        '''
        require_admin()
        new_attr = request.json['attr']
        if 'attrs' in typeobj:
            if any(attr['slug'] == new_attr['slug'] for attr in typeobj.attrs):
                flask_abort(httplib.CONFLICT, 'Attribute slug {!r} already exists'.format(new_attr['slug']))
            typeobj.attrs.append(new_attr)
        else:
            typeobj.attrs = [new_attr]
        typeobj.save()
        return typeobj.as_dict()

    @type_action('PUT', 'attrs')
    def update_attribute(self, typeobj):
        '''Update an attribute's definition.'''
        require_admin()
        updated_attr = request.json['attr']
        if 'slug' not in updated_attr:
            flask_abort(httplib.BAD_REQUEST, 'Attribute must have a "slug" property')
        if 'attrs' not in typeobj or not any(attr['slug'] == updated_attr['slug'] for attr in typeobj.attrs):
            flask_abort(httplib.CONFLICT, 'No such attribute {!r}'.format(updated_attr['slug']))
        typeobj.attrs = [updated_attr if attr['slug'] == updated_attr['slug'] else attr
                         for attr in typeobj.attrs]
        typeobj.save()
        return typeobj.as_dict()

    @type_action('DELETE', 'attrs')
    def delete_attribute(self, typeobj):
        '''Delete a user-defined attribute.'''
        require_admin()
        attr_slug = request.json['slug']
        if 'attrs' in typeobj:
            typeobj.attrs = list(attr for attr in typeobj.attrs if attr['slug'] != attr_slug)
            typeobj.save()
        return typeobj.as_dict()

    @object_action('PUT', 'attrs')
    def set_attr(self, obj):
        '''Sets a user-attribute for an object.'''
        require_user()
        attr_slug = request.json['slug']
        attr_value = request.json['value']
        if 'attrs' in obj:
            obj.attrs[attr_slug] = attr_value
        else:
            obj.attrs = {attr_slug: attr_value}
        obj.save()
        return obj.as_dict()

    @object_action('DELETE', 'attrs')
    def delete_attr(self, obj):
        '''Remove a user-defined attribute from an object.'''
        require_user()
        attr_slug = request.json['slug']
        if 'attrs' in obj and attr_slug in obj.attrs:
            del obj.attrs[attr_slug]
            obj.save()
        return obj.as_dict()
