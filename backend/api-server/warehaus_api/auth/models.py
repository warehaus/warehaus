from .. import db

class User(db.Model):
    username        = db.Field()
    role            = db.Field()
    display_name    = db.Field()
    email           = db.Field()
    hashed_password = db.Field()
    api_tokens      = db.Field(default=lambda: [])

    @classmethod
    def get_by_username(cls, username):
        return cls.query.get_one_or_none(username, index='username', error='Found more than one user with username={!r}'.format(username))

    @classmethod
    def get_by_api_token(cls, api_token):
        return cls.query.get_one_or_none(api_token, index='api_tokens', error='Found more than one user with api_token={!r}'.format(api_token))
