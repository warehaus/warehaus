import copy
import httplib
import rethinkdb as r
from logging import getLogger
from flask import request
from flask import abort as flask_abort
from flask_jwt import current_identity
from ..auth.roles import require_user
from ..auth.roles import require_admin
from ..events.models import create_event
from .models import create_object
from .models import get_objects_of_type
from .models import get_object_children
from .models import ensure_unique_slug

logger = getLogger(__name__)

OBJ_ACTION_ATTR = '_warehaus_object_action'
TYPE_ACTION_ATTR = '_warehaus_type_action'

def _add_attr_to_func(attr, value):
    def decorator(func):
        setattr(func, attr, value)
        return func
    return decorator

def object_action(method, name):
    '''When defined in a type `T`, this decorator creates an action which can be
    invoked on objects with type `T`.
    The `method` argument is the HTTP verb (`GET`, `POST`, etc.) and the `name`
    argument is the action name to be called through an HTTP URL. Make sure to
    keep `name` plain-ascii so that actions can be placed in URLs through command
    line.
    '''
    return _add_attr_to_func(OBJ_ACTION_ATTR, dict(method=method, name=name))

def type_action(method, name):
    '''Same as `object_action` but for type objects. The action can be invoked
    on type objects rather than objects.
    '''
    return _add_attr_to_func(TYPE_ACTION_ATTR, dict(method=method, name=name))

def get_object_action(func):
    return getattr(func, OBJ_ACTION_ATTR, None)

def get_type_action(func):
    return getattr(func, TYPE_ACTION_ATTR, None)

class TypeClass(object):
    TYPE_VENDOR = None
    TYPE_NAME = None
    USER_CONTROLLABLE = False

    @classmethod
    def type_key(cls):
        '''Returns a unique `type_key` for this type class. You should
        not override this method normally.'''
        return '{}-{}'.format(cls.TYPE_VENDOR, cls.TYPE_NAME)

    @classmethod
    def display_name(cls):
        return cls.type_key()

    @classmethod
    def description(cls):
        return ''

    def create_type_object(self, parent, slug, display_name=None):
        display_name = display_name if display_name is not None else self.display_name()
        ensure_unique_slug(parent, slug)
        type_object = create_object(
            type         = None, # Type objects have no type
            parent       = parent,
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
            typeclass.create_type_object(parent=type_object, slug=slug)

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
        return dict(objects=list(obj.as_dict() for obj in get_objects_of_type(typeobj)))

    @type_action('GET', 'children')
    def get_type_children(self, typeobj):
        '''Get all type-objects which are children of this type-object.'''
        require_user()
        return dict(children=list(child.as_dict() for child in get_object_children(typeobj)))

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
        try:
            new_attr = request.json['attr']
        except LookupError as error:
            flask_abort(httplib.BAD_REQUEST, 'Missing "{}" parameter'.format(error))
        if 'attrs' in typeobj:
            if any(attr['slug'] == new_attr['slug'] for attr in typeobj.attrs):
                flask_abort(httplib.CONFLICT, "There's already an attribute with slug '{}'".format(new_attr['slug']))
            typeobj.attrs = typeobj.attrs + [new_attr]
        else:
            typeobj.attrs = [new_attr]
        typeobj.save()
        return typeobj.as_dict(), httplib.CREATED

    @type_action('PUT', 'attrs')
    def update_attribute(self, typeobj):
        '''Update an attribute's definition.'''
        require_admin()
        try:
            attr_slug = request.json['slug']
            updated_attr = request.json['updated_attr']
        except LookupError as error:
            flask_abort(httplib.BAD_REQUEST, 'Missing "{}" parameter'.format(error))
        if 'slug' not in updated_attr:
            flask_abort(httplib.BAD_REQUEST, 'Updated attribute must have a "slug" property')
        if 'attrs' not in typeobj or not any(attr['slug'] == attr_slug for attr in typeobj.attrs):
            flask_abort(httplib.NOT_FOUND, 'No such attribute {!r}'.format(updated_attr['slug']))
        if (attr_slug != updated_attr['slug']) and any(attr['slug'] == updated_attr['slug'] for attr in typeobj.attrs):
            flask_abort(httplib.CONFLICT, "There's already an attribute with slug '{}'".format(updated_attr['slug']))
        typeobj.attrs = [updated_attr if attr['slug'] == attr_slug else attr for attr in typeobj.attrs]
        typeobj.save()
        return typeobj.as_dict()

    @type_action('DELETE', 'attrs')
    def delete_attribute(self, typeobj):
        '''Delete a user-defined attribute.'''
        require_admin()
        try:
            attr_slug = request.json['slug']
        except LookupError as error:
            flask_abort(httplib.BAD_REQUEST, 'Missing "{}" parameter'.format(error))
        if ('attrs' not in typeobj) or all(attr['slug'] != attr_slug for attr in typeobj.attrs):
            flask_abort(httplib.NOT_FOUND, 'No such attribute {!r}'.format(attr_slug))
        typeobj.attrs = list(attr for attr in typeobj.attrs if attr['slug'] != attr_slug)
        typeobj.save()
        return None, httplib.NO_CONTENT

    def _get_typeobj_attr(self, typeobj, attr_slug):
        if 'attrs' in typeobj:
            for attr in typeobj.attrs:
                if attr['slug'] == attr_slug:
                    return attr
        flask_abort(httplib.NOT_FOUND, "Objects of type {!r} don't have the {!r} attribute".format(typeobj.display_name['singular'], attr_slug))

    @object_action('PUT', 'attrs')
    def set_attr(self, obj):
        '''Sets a user-attribute for an object.'''
        require_user()
        try:
            attr_slug = request.json['slug']
            attr_value = request.json['value']
        except LookupError as error:
            flask_abort(httplib.BAD_REQUEST, 'Missing "{}" parameter'.format(error))
        lab = obj.get_parent_object()
        typeobj = obj.get_type_object()
        attr_type = self._get_typeobj_attr(typeobj, attr_slug)
        new_attrs = copy.copy(obj.attrs) if 'attrs' in obj else {}
        new_attrs[attr_slug] = attr_value
        obj.attrs = new_attrs
        obj.save()
        create_event(
            obj_id = obj.id,
            user_id = current_identity.id,
            interested_ids = [obj.id, lab.id],
            title = 'Set the **{}** attribute of **{}**'.format(attr_type['display_name'], obj.display_name),
            content = attr_value,
        )
        return obj.as_dict()

    @object_action('DELETE', 'attrs')
    def delete_attr(self, obj):
        '''Remove a user-defined attribute from an object.'''
        require_user()
        lab = obj.get_parent_object()
        typeobj = obj.get_type_object()
        try:
            attr_slug = request.json['slug']
        except LookupError as error:
            flask_abort(httplib.BAD_REQUEST, 'Missing "{}" parameter'.format(error))
        attr_type = self._get_typeobj_attr(typeobj, attr_slug)
        if 'attrs' in obj and attr_slug in obj.attrs:
            obj.attrs = r.literal({slug: value for slug, value in obj.attrs.iteritems() if slug != attr_slug})
            obj.save()
        create_event(
            obj_id = obj.id,
            user_id = current_identity.id,
            interested_ids = [obj.id, lab.id],
            title = 'Removed the **{}** attribute from **{}**'.format(attr_type['display_name'], obj.display_name),
        )
        return None, httplib.NO_CONTENT
