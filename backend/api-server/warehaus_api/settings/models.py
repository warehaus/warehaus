import random
from bunch import Bunch
from contextlib import contextmanager
from .. import db

def make_key():
    return ''.join(random.choice('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~ ') for _ in xrange(48))

class Settings(db.Model):
    jwt_secret    = db.Field(default=make_key)
    password_salt = db.Field(default=make_key)
    auth          = db.Field()

SETTINGS_ID = 1 # Allow only one Settings row

def get_settings():
    settings = Settings.query.get(SETTINGS_ID)
    if settings is None:
        settings = Settings(id=SETTINGS_ID)
        settings.save(force_insert=True)
    return settings

@contextmanager
def edit_settings():
    settings = get_settings()
    try:
        yield settings
    except:
        raise
    else:
        settings.save()
