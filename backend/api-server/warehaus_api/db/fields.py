import rethinkdb as r
from logging import getLogger
from rethinkdb import ReqlOpFailedError
from .db import db

logger = getLogger(__name__)

class _NO_DEFAULT(object):
    pass

class Field(object):
    def __init__(self, field_name=None, default=_NO_DEFAULT):
        super(Field, self).__init__()
        self.default = default
        self._field_name = field_name

    def _get_field_name(self):
        if self._field_name is None:
            raise ValueError('field_name is not set')
        return self._field_name
    def _set_field_name(self, field_name):
        if self._field_name is not None:
            raise ValueError('Cannot set field_name twice')
        self._field_name = field_name
    field_name = property(_get_field_name, _set_field_name)

    def has_default_value(self):
        return self.default is not _NO_DEFAULT

    def default_value(self):
        if not self.has_default_value():
            raise AttributeError('Field {} has no value'.format(self.field_name))
        return self.default() if callable(self.default) else self.default
