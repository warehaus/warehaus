import httplib
import rethinkdb as r
from copy import deepcopy
from logging import getLogger
from bunch import Bunch
from flask import current_app
from flask import abort as flask_abort
from rethinkdb import ReqlRuntimeError
from rethinkdb import ReqlOpFailedError
from .db import db
from .times import now
from .exceptions import RethinkDBError
from .fields import Field

logger = getLogger(__name__)

class Query(object):
    def __init__(self, model_type):
        super(Query, self).__init__()
        self.model_type = model_type

    def get(self, *args, **kwargs):
        doc = r.table(self.model_type._table_name).get(*args, **kwargs).run(db.conn)
        if doc is None:
            return None
        return self.model_type(**doc)

    def _run_query_and_wrap_objects(self, query):
        return (self.model_type(**doc) for doc in query.run(db.conn))

    def all(self):
        return self._run_query_and_wrap_objects(r.table(self.model_type._table_name))

    def get_all(self, *args, **kwargs):
        return self._run_query_and_wrap_objects(r.table(self.model_type._table_name).get_all(*args, **kwargs))

    def between(self, *args, **kwargs):
        return self._run_query_and_wrap_objects(r.table(self.model_type._table_name).between(*args, **kwargs))

    def filter(self, *args, **kwargs):
        return self._run_query_and_wrap_objects(r.table(self.model_type._table_name).filter(*args, **kwargs))

    def get_one_or_none(self, *args, **kwargs):
        error = kwargs.pop('error', None)
        if error is None:
            raise TypeError('This function must get an error parameter')
        docs = tuple(self.get_all(*args, **kwargs))
        if not docs:
            return None
        if len(docs) != 1:
            flask_abort(httplib.INTERNAL_SERVER_ERROR, error)
        return docs[0]

    def get_exactly_one(self, *args, **kwargs):
        error = kwargs.pop('error', None)
        obj = self.get_one_or_none(error=error, *args, **kwargs)
        if obj is None:
            flask_abort(httplib.INTERNAL_SERVER_ERROR, error)
        return obj

class ModelType(type):
    def __new__(mcs, name, bases, attrs):
        for forbidden in ('_data', '_dirty_data', '_fields', '_table_name'):
            if forbidden in attrs:
                raise TypeError("Model subclasses should not provide a '{}' attribute of their own".format(forbidden))
        if 'id' in attrs:
            raise TypeError("An 'id' is automatically created in {} classes, please don't create one manually".format(name))
        attrs['_table_name'] = attrs.get('TABLE_NAME', name.lower())
        attrs['_fields'] = {
            'id'          : Field(field_name='id'),
            'created_at'  : Field(field_name='created_at', default=now),
            'modified_at' : Field(field_name='modified_at', default=now),
        }
        for attr, obj in tuple(attrs.iteritems()):
            if isinstance(obj, Field):
                del attrs[attr]
                obj.field_name = attr
                attrs['_fields'][attr] = obj
        typeobj = type.__new__(mcs, name, bases, attrs)
        typeobj.query = Query(typeobj)
        return typeobj

class Model(object):
    __metaclass__ = ModelType
    _allow_additional_items = False

    def __init__(self, **kwargs):
        super(Model, self).__init__()
        self._check_extraneous_fields(**kwargs)
        self._data = dict(kwargs)
        for field_name, field in self._fields.iteritems():
            if field_name not in kwargs and field.has_default_value():
                self._data[field_name] = field.default_value()
        self._dirty_data = {}

    def _check_extraneous_fields(self, **kwargs):
        if self._allow_additional_items:
            return
        extraneous_fields = set(kwargs) - set(self._fields)
        if extraneous_fields:
            raise TypeError("{} doesn't have the following attributes: {}".format(
                type(self).__name__, ', '.join(extraneous_fields)))

    def update(self, **kwargs):
        self._check_extraneous_fields()
        for field_name, new_value in kwargs.iteritems():
            self[field_name] = new_value

    def _insert(self):
        result = r.table(self._table_name).insert(self._data).run(db.conn)
        if result['inserted'] != 1:
            raise RethinkDBError('Expected 1 insertion, instead: {!r}'.format(result))
        if 'id' not in self:
            [self._data['id']] = result['generated_keys']

    def _update(self):
        self._dirty_data['modified_at'] = now()
        result = r.table(self._table_name).get(self._data['id']).update(self._dirty_data).run(db.conn)
        if (result['replaced'] + result['unchanged']) != 1:
            raise RethinkDBError('Expected 1 replacement or unchanged, instead: {!r}'.format(result))
        self._data.update(self._dirty_data)
        self._dirty_data = {}

    def save(self, force_insert=False):
        if force_insert or ('id' not in self._data):
            self._insert()
        elif self._dirty_data:
            # We only send updates when there's actual dirty data. A side effect is that
            # some updates won't change 'modified_at', but the performance gain is more
            # important in such cases.
            self._update()

    def delete(self):
        if 'id' not in self._data or self._data['id'] is None:
            raise RethinkDBError('Attempt to delete a document not in the database')
        assert not self._dirty_data, 'Trying to delete a dirty object'
        result = r.table(self._table_name).get(self._data['id']).delete().run(db.conn)
        if result['deleted'] != 1:
            raise RethinkDBError('Expected 1 deletion, instead: {!r}'.format(result))
        del self._data['id']

    def _attr_allowed(self, attr):
        return (attr in self._fields) or (self._allow_additional_items and not attr.startswith('_'))

    def __getattr__(self, attr):
        if self._attr_allowed(attr):
            if attr not in self._data:
                if attr in self._fields:
                    self._data[attr] = self._fields[attr].default_value()
            if attr in self._data:
                return self._data[attr]
        return super(Model, self).__getattr__(attr)

    def __setattr__(self, attr, value):
        if self._attr_allowed(attr):
            if (attr in self._data) and (value == self._data[attr]):
                return
            self._data[attr] = value
            self._dirty_data[attr] = value
        else:
            return super(Model, self).__setattr__(attr, value)

    def __delattr__(self, attr):
        raise NotImplementedError()

    def __contains__(self, attr):
        return attr in self._data

    __getitem__ = __getattr__
    __setitem__ = __setattr__
    __delitem__ = __delattr__

    def __iter__(self):
        return iter(self._fields)

    def as_dict(self):
        return deepcopy(self._data)
