from bunch import Bunch
from .extension import db
from .exceptions import RethinkDBError

class ModelType(type):
    def __new__(mcs, name, bases, attrs):
        if '_table' in attrs:
            raise TypeError('Derived `Model` classes should not provide a `_table` attribute of their own')
        attrs['_table'] = db.define_table(name.lower())
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

    def save(self):
        doc = {key: value for key, value in self.iteritems() if not key.startswith('_')}
        if 'id' in doc:
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
