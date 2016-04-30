from .. import db

class ApiToken(db.Model):
    TABLE_NAME = 'user_api_token'
    user_id = db.Field()

class User(db.Model):
    username        = db.Field()
    role            = db.Field()
    display_name    = db.Field()
    email           = db.Field()
    hashed_password = db.Field()
    api_tokens      = db.Field()
    ssh_keys        = db.Field()

    @classmethod
    def get_by_username(cls, username):
        return cls.query.get_one_or_none(username, index='username', error='Found more than one user with username={!r}'.format(username))

    @classmethod
    def get_by_api_token(cls, api_token):
        token_doc = ApiToken.query.get(api_token)
        if token_doc is None:
            return None
        return User.query.get(token_doc.user_id)
