import os
from .models import get_settings

def _postgres_database_uri():
    _pg_host = os.environ.get('POSTGRES_PORT_5432_TCP_ADDR', None)
    _pg_port = os.environ.get('POSTGRES_PORT_5432_TCP_PORT', None)
    _pg_user = os.environ.get('POSTGRES_USER', 'labsome')
    _pg_password = os.environ.get('POSTGRES_PASSWORD', 'labsome')
    _pg_db_name = os.environ.get('POSTGRES_DB_NAME', 'labsome')

    _pg_credentials = '{}:{}@'.format(_pg_user, _pg_password) if (_pg_user and _pg_password) else ''

    postgres_database_uri = os.environ.get('POSTGRES_DATABASE_URI', (
        'postgresql://{}{}:{}/{}'.format(_pg_credentials, _pg_host, _pg_port, _pg_db_name)
        if None not in (_pg_host, _pg_port) else None))

    return postgres_database_uri

def database_config():
    '''Called to get the initial configuration for connecting to the
    database. Since some of the other configuration is stored in
    the database we need this minimal configuration first.
    '''
    class DatabaseConfig(object):
        SQLALCHEMY_DATABASE_URI = _postgres_database_uri()
        SQLALCHEMY_TRACK_MODIFICATIONS = True
    return DatabaseConfig

def full_config():
    '''Returns the full configuration of the server assuming we're
    connected to the database.
    '''
    settings = get_settings()

    class FullConfig(object):
        SECRET_KEY = settings.SECRET_KEY.decode('hex')

        SQLALCHEMY_COMMIT_ON_TEARDOWN = True

        SECURITY_CONFIRMABLE = False
        SECURITY_TRACKABLE = False
        SECURITY_URL_PREFIX = '/auth'
        SECURITY_FLASH_MESSAGES = False
        SECURITY_USER_IDENTITY_ATTRIBUTES = 'username'
        SECURITY_PASSWORD_HASH = 'bcrypt'
        SECURITY_PASSWORD_SALT = settings.SECURITY_PASSWORD_SALT.decode('hex')

        LDAP_SETTINGS = settings.LDAP_SETTINGS

    return FullConfig
