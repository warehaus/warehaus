import rethinkdb as r
from logging import getLogger
from bunch import Bunch
from flask import current_app
from rethinkdb import ReqlRuntimeError
from rethinkdb import ReqlOpFailedError
from .db import db
from .exceptions import RethinkDBError

logger = getLogger(__name__)

class ModelType(type):
    def __new__(mcs, name, bases, attrs):
        if '_table' in attrs:
            raise TypeError('Derived `Model` classes should not provide a `_table` attribute of their own')
        attrs['_table_name'] = name.lower()
        attrs['_table'] = r.table(attrs['_table_name'])
        return type.__new__(mcs, name, bases, attrs)

class Model(Bunch):
    __metaclass__ = ModelType

    @classmethod
    def get(cls, *args, **kwargs):
        doc = cls._table.get(*args, **kwargs).run(db.conn)
        if doc is None:
            return None
        return cls(**doc)

    @classmethod
    def all(cls):
        docs = cls._table.run(db.conn)
        return (cls(**doc) for doc in docs)

    @classmethod
    def get_all(cls, *args, **kwargs):
        docs = cls._table.get_all(*args, **kwargs).run(db.conn)
        return (cls(**doc) for doc in docs)

    @classmethod
    def between(cls, *args, **kwargs):
        docs = cls._table.between(*args, **kwargs).run(db.conn)
        return (cls(**doc) for doc in docs)

    @classmethod
    def filter(cls, *args, **kwargs):
        docs = cls._table.filter(*args, **kwargs).run(db.conn)
        return (cls(**doc) for doc in docs)

    def save(self, force_insert=False):
        doc = {key: value for key, value in self.iteritems() if not key.startswith('_')}
        if not force_insert and ('id' in doc):
            result = self._table.update(doc).run(db.conn)
            if (result['replaced'] + result['unchanged']) != 1:
                raise RethinkDBError('Expected 1 replacement or unchanged, instead: {!r}'.format(result))
        else:
            result = self._table.insert(doc).run(db.conn)
            if result['inserted'] != 1:
                raise RethinkDBError('Expected 1 insertion, instead: {!r}'.format(result))
            [self.id] = result['generated_keys']

    def delete(self):
        if 'id' not in self or self.id is None:
            raise RethinkDBError('Attempt to delete a document not in the database')
        result = self._table.get(self.id).delete().run(db.conn)
        if result['deleted'] != 1:
            raise RethinkDBError('Expected 1 deletion, instead: {!r}'.format(result))
        del self.id

def _create_db():
    db_name = db.db or current_app.config['RETHINKDB_DB']
    try:
        logger.debug('Creating database: {}'.format(db_name))
        r.db_create(db_name).run(db.conn)
    except ReqlRuntimeError as error:
        logger.debug('While running db_create: {}'.format(error))

def _create_tables():
    for model in Model.__subclasses__():
        try:
            logger.debug('Creating table: {}'.format(model._table_name))
            r.table_create(model._table_name).run(db.conn)
        except ReqlOpFailedError as error:
            logger.debug('While running table_create: {}'.format(error))

def ensure_models():
    _create_db()
    _create_tables()
