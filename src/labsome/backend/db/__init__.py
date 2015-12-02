from .db import db
from .model import Model
from .model import ensure_models
from .resource import register_resource

def init_app(app):
    db.init_app(app)
    ensure_models()
