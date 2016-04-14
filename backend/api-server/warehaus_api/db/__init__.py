import rethinkdb
from .db import db
from .models import Model
from .fields import Field
from . import times

def init_db(app):
    rethinkdb.set_loop_type('gevent')
    db.init_app(app)
