import os
import pkg_resources
from flask import Flask
from flask import redirect
from flask.ext.login import login_required
from .settings import database_config
from .settings import full_config
from .settings.models import get_settings
from . import auth
from . import db
from .db.json_encoder import CustomJSONEncoder
from .first_setup.api import first_setup_api
from .auth.api import auth_api
from .settings.api import settings_api
from .hardware.api import hardware_api
from .hardware.servers import servers_api

def _no_db_routes(app):
    @app.route('/')
    @app.route('/<path:path>')
    def no_database(path=None):
        return app.send_static_file('templates/first-setup/no-database.html')

def _first_setup_routes(app):
    @app.route('/')
    @app.route('/first-setup')
    def first_setup_redirect():
        return redirect('/first-setup/')

    @app.route('/first-setup/')
    @app.route('/first-setup/<path:path>')
    def first_setup(path=None):
        return app.send_static_file('templates/first-setup/index.html')

    app.register_blueprint(first_setup_api, url_prefix='/api/first-setup')

def _full_app_routes(app):
    @app.route('/')
    @app.route('/site')
    def site_redirect():
        return redirect('/site/')

    @app.route('/site/')
    @app.route('/site/<path:path>')
    @login_required
    def site(path=None):
        return app.send_static_file('templates/main-site/index.html')

    app.register_blueprint(auth_api, url_prefix='/api/auth')
    app.register_blueprint(settings_api, url_prefix='/api/settings')
    app.register_blueprint(hardware_api, url_prefix='/api/hardware')
    app.register_blueprint(servers_api, url_prefix='/api/servers')

def _print_config(app):
    print 'Configuration:'
    for key, value in sorted(app.config.iteritems()):
        print '  ', key, '=', repr(app.config[key])

def create_app(print_config=False):
    static_folder = pkg_resources.resource_filename('labsome', 'static')
    template_folder = os.path.join(static_folder, 'templates')
    app = Flask(__name__, static_folder=static_folder, template_folder=template_folder)
    app.json_encoder = CustomJSONEncoder
    app.config.from_object(database_config())

    if not app.config['RETHINKDB_HOST']:
        _no_db_routes(app)
    else:
        with app.app_context():
            db.init_app(app)
            app.config.from_object(full_config())
            auth.init_app(app)

            if print_config:
                _print_config(app)

            if not get_settings().is_initialized:
                _first_setup_routes(app)
            else:
                _full_app_routes(app)

    return app
