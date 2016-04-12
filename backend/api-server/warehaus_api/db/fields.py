import rethinkdb as r
from logging import getLogger
from rethinkdb import ReqlOpFailedError
from .db import db

logger = getLogger(__name__)

__all__ = [
    'Field',
]

class Requirement(object):
    def __init__(self):
        super(Requirement, self).__init__()
        self._field_name = None

    def _get_field_name(self):
        if self._field_name is None:
            raise ValueError('field_name is not set')
        return self._field_name
    def _set_field_name(self, field_name):
        if self._field_name is not None:
            raise ValueError('Cannot set field_name twice')
        self._field_name = field_name
    field_name = property(_get_field_name, _set_field_name)

    def pre_table_create(self):
        pass

    def post_table_create(self, table):
        pass

    def before_app_start(self, table):
        pass

class _NO_DEFAULT(object):
    pass

class Field(object):
    def __init__(self, *requirements, **kwargs):
        super(Field, self).__init__()
        self.requirements = tuple(requirements)
        self.default = kwargs.pop('default', _NO_DEFAULT)
        self._field_name = kwargs.pop('field_name', None)
        if kwargs:
            raise TypeError('Unrecognized keyword arguments: {}'.format(', '.join(kwargs)))

    def _get_field_name(self):
        if self._field_name is None:
            raise ValueError('field_name is not set')
        return self._field_name
    def _set_field_name(self, field_name):
        if self._field_name is not None:
            raise ValueError('Cannot set field_name twice')
        self._field_name = field_name
        for requirement in self.requirements:
            requirement.field_name = field_name
    field_name = property(_get_field_name, _set_field_name)

    def pre_table_create(self):
        for requirement in self.requirements:
            requirement.pre_table_create()

    def post_table_create(self, table):
        for requirement in self.requirements:
            requirement.post_table_create(table)

    def before_app_start(self, table):
        for requirement in self.requirements:
            requirement.before_app_start(table)

    def has_default_value(self):
        return self.default is not _NO_DEFAULT

    def default_value(self):
        if not self.has_default_value():
            raise AttributeError('Field {} has no value'.format(self.field_name))
        return self.default() if callable(self.default) else self.default
