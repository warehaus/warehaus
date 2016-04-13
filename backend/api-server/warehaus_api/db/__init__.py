from .db import db
from .models import Model
from .fields import *
from . import times

def init_db(app):
    db.init_app(app)
