from datetime import timedelta
from logging import getLogger
from flask import request
from flask_jwt import JWT
from .models import User
from .roles import roles
from .roles import user_required
from .roles import admin_required
from .ldap_login import validate_ldap_user

logger = getLogger(__name__)

def authenticate(username, password):
    try:
        user = validate_ldap_user(username, password)
        logger.info('Successfully authenticated {!r}'.format(username))
        return user
    except Exception as error:
        logger.exception('Error authenticating {!r}'.format(username))

def identify(payload):
    logger.debug('Got payload: {!r}'.format(payload))
    return User.query.get(payload.get('identity', None))

def init_app(app):
    app.config['JWT_AUTH_URL_RULE'] = '/api/auth/v1/login'
    app.config['JWT_EXPIRATION_DELTA'] = timedelta(days=7)
    app.config['JWT_AUTH_HEADER_PREFIX'] = 'JWT'

    jwt = JWT(app, authenticate, identify)