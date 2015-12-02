from flask.ext.login import UserMixin
from ..db import Model

class User(Model, UserMixin):
    _indexes = {
        'username': ['username'],
    }

    @classmethod
    def get_by_username(cls, username):
        docs = tuple(cls.get_all([username], index='username'))
        if not docs:
            return None
        if len(docs) != 1:
            raise RuntimeError('Found more than one user with username={!r}'.format(username))
        return cls(**docs[0])
