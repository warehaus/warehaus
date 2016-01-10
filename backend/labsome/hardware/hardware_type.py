import re
from logging import getLogger
from .models import Object

logger = getLogger(__name__)

class HardwareTypeType(type):
    def __new__(mcs, name, bases, attrs):
        if name != 'HardwareType':
            for attr_name in ('TYPE_VENDOR', 'TYPE_NAME'):
                value = attrs[attr_name]
                if not value or not isinstance(value, basestring):
                    raise TypeError('You must set a string value for `{}` in {}'.format(attr_name, name))
                if not re.match(r'\w+', value):
                    raise TypeError('The `{}` attribute must be alphanumeric'.format(attr_name))
        return type.__new__(mcs, name, bases, attrs)

class HardwareType(object):
    __metaclass__ = HardwareTypeType

    TYPE_VENDOR = None
    TYPE_NAME = None

    @classmethod
    def type_key(cls):
        '''Returns a unique `type_key` to be referenced by `Lab`s and `Object`s'''
        return '{}-{}'.format(cls.TYPE_VENDOR, cls.TYPE_NAME)

    @classmethod
    def display_name(cls):
        '''Returns a name to be displayed to users. By default this is the type_key,
        override this method to set your own display name.'''
        return cls.type_key()

    @classmethod
    def get_by_id(cls, id):
        '''Returns an object by id, or None if not found'''
        return Object.query.get(id)

    @classmethod
    def get_by_slug_and_lab(cls, slug, lab_id):
        '''Finds a unique `Object` of this type in `lab_id`.'''
        objs = tuple(Object.query.get_all([cls.type_key(), slug, lab_id], index='type_slug_lab'))
        if len(objs) == 0:
            return None
        if len(objs) == 1:
            return objs[0]
        raise RuntimeError('Found more than 1 object with slug={!r} lab_id={!r} type_key={!r}'.format(slug, lab_id, cls.type_key()))

    @classmethod
    def create(cls, **kwargs):
        '''Create and return a new `Object` of this type.'''
        return Object(type_key=cls.type_key(), **kwargs)

    @classmethod
    def register_api(cls, app_or_blueprint, url_prefix):
        '''Called when creating API routes.'''
        pass

    @classmethod
    def allow_ownership(cls):
        '''Sets whether a user can set ownership for objects of this type through the API.'''
        return False
