import re
import httplib
from logging import getLogger
from ..auth.roles import require_user
from ..auth.roles import require_admin
from .models import Object

logger = getLogger(__name__)

OBJ_ACTION_ATTR = '_warehaus_object_action'
TYPE_ACTION_ATTR = '_warehaus_type_action'

def object_action(method, name):
    def decorator(func):
        setattr(func, OBJ_ACTION_ATTR, dict(method=method, name=name))
        return func
    return decorator

def type_action(method, name):
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
