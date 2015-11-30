from .extension import db
from .model import Model
from .resource import register_resource

def init_app(app):
    db.init_app(app)
    db.create_all()
