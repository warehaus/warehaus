from flask import Flask
from .db import init_db
from .settings import database_config
from .settings import full_config
from .auth import models
from .hardware import models
from .settings import models

def create_base_app(**kwargs):
    app = Flask(__name__, **kwargs)
    app.config.from_object(database_config())
    with app.app_context():
        init_db(app)
        app.config.from_object(full_config())
    return app
