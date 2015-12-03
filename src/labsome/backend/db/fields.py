import rethinkdb as r
from logging import getLogger
from rethinkdb import ReqlOpFailedError
from .db import db

logger = getLogger(__name__)

__all__ = [
    'Field',
    'Index',
    'IndexWith',
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

class Index(Requirement):
    def __init__(self, multi=False):
        super(Index, self).__init__()
        self.multi = multi

    def _create_index(self, table):
        table.index_create(self.field_name, multi=self.multi).run(db.conn)

    def _wait_for_index(self, table):
        table.index_wait(self.field_name).run(db.conn)

    def post_table_create(self, table):
        logger.debug('Creating index {!r} on {!r}'.format(self.field_name, table))
        try:
            self._create_index(table)
        except ReqlOpFailedError as error:
            logger.debug('While creating index: {}'.format(error))

    def before_app_start(self, table):
        logger.debug('Waiting for index {!r} on {!r}'.format(self.field_name, table))
        self._wait_for_index(table)

class IndexWith(Index):
    def __init__(self, name, other_fields):
        super(IndexWith, self).__init__()
        self.name = name
        self.other_fields = other_fields

    def _create_index(self, table):
        index_fields = [r.row[self.field_name]] + list(r.row[other_field] for other_field in self.other_fields)
        table.index_create(self.name, index_fields).run(db.conn)

    def _wait_for_index(self, table):
        table.index_wait(self.name).run(db.conn)

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
