import os
from bunch import Bunch
from contextlib import contextmanager
from ..db import Model

class Settings(Model):
    pass

SETTINGS_ID = 1 # Allow only one Settings row

def _new_settings():
    return dict(
        id = SETTINGS_ID,
        is_initialized = False,
        secret_key = os.urandom(48).encode('hex'),
    )

def get_settings():
    settings = Settings.get(SETTINGS_ID)
    if settings is None:
        settings = Settings(**_new_settings())
        settings.save(force_insert=True)
    return Bunch(settings)

@contextmanager
def edit_settings():
    settings = get_settings()
    try:
        yield settings
    except:
        raise
    else:
        settings.save()
