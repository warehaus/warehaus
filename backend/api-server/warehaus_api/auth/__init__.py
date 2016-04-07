from datetime import datetime
from datetime import timedelta
from logging import getLogger
from flask import request
from flask import current_app
from flask_jwt import JWT
from .models import User
from .roles import roles

logger = getLogger(__name__)

def identify(payload):
    logger.debug('Got payload: {!r}'.format(payload))
    jwt_subject = payload.get('sub', None)
    if jwt_subject is None:
        return None
    return User.query.get(jwt_subject)

def payload_handler(identity):
    iat = datetime.utcnow()
    exp = iat + current_app.config.get('JWT_EXPIRATION_DELTA')
    nbf = iat + current_app.config.get('JWT_NOT_BEFORE_DELTA')
    identity = getattr(identity, 'id') or identity['id']
    return {'exp': exp, 'iat': iat, 'nbf': nbf, 'sub': identity}

def init_auth(app):
    app.config['JWT_AUTH_URL_RULE'] = None
    app.config['JWT_EXPIRATION_DELTA'] = timedelta(days=7)
    app.config['JWT_AUTH_HEADER_PREFIX'] = 'JWT'
    jwt = JWT(app, None, identify)
    jwt.jwt_payload_handler(payload_handler)
