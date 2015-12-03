import os
from bunch import Bunch
from contextlib import contextmanager
from .. import db

class Settings(db.Model):
    is_initialized = db.Field(default=False)
    secret_key     = db.Field(default=lambda: os.urandom(48).encode('hex'))
    ldap_settings  = db.Field(default=lambda: {})

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
