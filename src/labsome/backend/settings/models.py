import os
from contextlib import contextmanager
from ..db import db

Settings = db.define_table('settings')

SETTINGS_ID = 1 # Allow only one Settings row

def _new_settings():
    return dict(
        id = SETTINGS_ID,
        is_initialized = False,
        secret_key = os.urandom(48).encode('hex'),
    )

def get_settings():
    settings = Settings.get(SETTINGS_ID).run(db.conn)
    if settings is None:
        settings = _new_settings()
        Settings.insert(settings).run(db.conn)
    return settings

@contextmanager
def edit_settings():
    settings = get_settings()
    try:
        yield settings
    except:
        raise
    else:
        Settings.update(settings).run(db.conn)
