import random
from bunch import Bunch
from contextlib import contextmanager
from .. import db

class Settings(db.Model):
    jwt_secret    = db.Field()
    password_salt = db.Field()
    auth          = db.Field()

SETTINGS_ID = 1 # Allow only one Settings row

def get_settings():
    return Settings.query.get(SETTINGS_ID)
