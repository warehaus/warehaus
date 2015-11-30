import httplib
from logging import getLogger
from urlparse import urlsplit
from flask import request
from flask import redirect
from flask import render_template
from flask.ext.login import LoginManager
from flask.ext.login import login_user
from flask.ext.login import logout_user
from .models import User
from ..db import db
from .ldap_login import LdapLoginForm
from .roles import roles
from .roles import user_required
from .roles import admin_required

logger = getLogger(__name__)

# From flask_security
def next_is_valid(url):
    if url is None or url.strip() == '':
        return False
    url_next = urlsplit(url)
    url_base = urlsplit(request.host_url)
    if (url_next.netloc or url_next.scheme) and url_next.netloc != url_base.netloc:
        return False
    return True

def init_app(app):
    login_manager = LoginManager(app)
    login_manager.session_protection = 'strong'
    login_manager.login_view = 'login'

    @login_manager.user_loader
    def load_user(user_id):
        return User.get(user_id)

    @app.route('/auth/login', methods=['GET', 'POST'])
    def login():
        form = LdapLoginForm()
        if form.validate_on_submit():
            logger.info('Logging in user: username={!r} id={!r}'.format(form.user.username, form.user.id))
            login_user(form.user, remember=True)
            next = request.args.get('next')
            if not next_is_valid(next):
                logger.warn('Rejecting next={!r}'.format(next))
                return flask.abort(httplib.BAD_REQUEST)
            return redirect(next or flask.url_for('index'))
        return render_template('auth/login.html', form=form)

    @app.route('/auth/logout')
    def logout():
        logout_user()
        return redirect('/')
