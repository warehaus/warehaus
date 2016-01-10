from flask import Flask
from . import db
from .settings import database_config
from .settings import full_config
from .db.json_encoder import CustomJSONEncoder
from .auth import models
from .hardware import models
from .settings import models

def create_base_app(**kwargs):
    app = Flask(__name__, **kwargs)
    app.json_encoder = CustomJSONEncoder
    app.config.from_object(database_config())
    with app.app_context():
        db.init_app(app)
        app.config.from_object(full_config())
    return app
