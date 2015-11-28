import os
from contextlib import contextmanager
from sqlalchemy_utils import JSONType
from ..db import db

class Settings(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    is_initialized = db.Column(db.Boolean, default=False)
    SECRET_KEY = db.Column(db.String(256), default=lambda: os.urandom(48).encode('hex'))
    SECURITY_PASSWORD_SALT = db.Column(db.String(256), default=lambda: os.urandom(64).encode('hex'))
    LDAP_SETTINGS = db.Column(JSONType)

SETTINGS_ID = 1 # Allow only one Settings row

def get_settings():
    settings = Settings.query.get(SETTINGS_ID)
    if settings is None:
        settings = Settings()
        db.session.add(settings)
        db.session.commit()
    return settings

@contextmanager
def edit_settings():
    settings = get_settings()
    try:
        yield settings
    except:
        raise
    else:
        db.session.add(settings)
        db.session.commit()
