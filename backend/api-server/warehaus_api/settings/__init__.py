import os
from .models import get_settings

def database_config():
    '''Called to get the initial configuration for connecting to the
    database. Since some of the other configuration is stored in
    the database we need this minimal configuration first.
    '''
    class DatabaseConfig(object):
        RETHINKDB_HOST = os.environ.get('RETHINKDB_PORT_28015_TCP_ADDR', None)
        RETHINKDB_PORT = os.environ.get('RETHINKDB_PORT_28015_TCP_PORT', None)
        RETHINKDB_AUTH = os.environ.get('RETHINKDB_AUTH', '')
        RETHINKDB_DB   = os.environ.get('RETHINKDB_DB', 'warehaus')
    return DatabaseConfig

def full_config():
    '''Returns the full configuration of the server assuming we're
    connected to the database.
    '''
    settings = get_settings()

    class FullConfig(object):
        SECRET_KEY = settings.secret_key
        LDAP_SETTINGS = settings.ldap_settings

    return FullConfig
