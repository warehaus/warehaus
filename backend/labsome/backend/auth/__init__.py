from flask import request
from flask.ext.login import LoginManager
from .models import User
from .roles import roles
from .roles import user_required
from .roles import admin_required

def init_app(app):
    login_manager = LoginManager(app)
    login_manager.session_protection = 'strong'
    login_manager.login_view = 'login'

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(user_id)

    @login_manager.request_loader
    def load_user_from_request(req):
        api_token = req.args.get('token') or req.headers.get('Authentication-Token')
        if api_token:
            return User.get_by_api_token(api_token)
        return None
