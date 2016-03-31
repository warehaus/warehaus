import re
import httplib
from logging import getLogger
from flask import request
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

class TypeClass(object):
    TYPE_VENDOR = None
    TYPE_NAME = None

    @classmethod
    def type_key(cls):
        '''Returns a unique `type_key` for this type class. You should
        not override this method normally.'''
        return '{}-{}'.format(cls.TYPE_VENDOR, cls.TYPE_NAME)

    def display_name(self):
        return self.type_key()

    @object_action('GET', '')
    def get_object(self, obj):
        require_user()
        return obj.as_dict()

    @type_action('GET', '')
    def get_type(self, typeobj):
        require_user()
        return typeobj.as_dict()

    @type_action('GET', 'objects')
    def get_objects_of_type(self, typeobj):
        require_user()
        return dict(objects=list(obj.as_dict() for obj in Object.query.filter(dict(type_id=typeobj.id))))

    @type_action('GET', 'children')
    def get_type_children(self, typeobj):
        require_user()
        return dict(children=list(child.as_dict() for child in Object.query.filter(dict(parent_id=typeobj.id))))

    @type_action('DELETE', '')
    def delete_type(self, typeobj):
        require_admin()
        typeobj.delete()
        return None, httplib.NO_CONTENT

    @type_action('POST', 'attrs')
    def add_attribute(self, typeobj):
        require_admin()
        attr = request.json['attr']
        if 'attrs' in typeobj:
            typeobj.attrs.append(attr)
        else:
            typeobj.attrs = [attr]
        typeobj.save()
        return typeobj.as_dict()

    @type_action('DELETE', 'attrs')
    def delete_attribute(self, typeobj):
        require_admin()
        attr_slug = request.json['slug']
        if 'attrs' in typeobj:
            typeobj.attrs = list(attr for attr in typeobj.attrs if attr['slug'] != attr_slug)
            typeobj.save()
        return typeobj.as_dict()

    @object_action('PUT', 'attrs')
    def set_attr(self, obj):
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
        require_user()
        attr_slug = request.json['slug']
        if 'attrs' in obj and attr_slug in obj.attrs:
            del obj.attrs[attr_slug]
            obj.save()
        return obj.as_dict()
