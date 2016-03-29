from .. import db

class User(db.Model):
    username        = db.Field(db.Index())
    roles           = db.Field()
    first_name      = db.Field()
    last_name       = db.Field()
    email           = db.Field()
    hashed_password = db.Field()
    api_tokens      = db.Field(db.Index(multi=True), default=lambda: [])

    @classmethod
    def get_by_username(cls, username):
        docs = tuple(cls.query.get_all(username, index='username'))
        if not docs:
            return None
        if len(docs) != 1:
            raise RuntimeError('Found more than one user with username={!r}'.format(username))
        return docs[0]

    @classmethod
    def get_by_api_token(cls, api_token):
        docs = tuple(cls.query.get_all(api_token, index='api_tokens'))
        if not docs:
            return None
        if len(docs) != 1:
            raise RuntimeError('Found more than one user with api_token={!r}'.format(api_token))
        return docs[0]
