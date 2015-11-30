import rethinkdb as r
from rethinkdb import ReqlRuntimeError
from rethinkdb import ReqlOpFailedError
from logging import getLogger
from flask import current_app
from flask_rethinkdb import RethinkDB
from .exceptions import RethinkDBError

logger = getLogger(__name__)

class LabsomeRethinkDB(RethinkDB):
    def __init__(self, *args, **kwargs):
        super(LabsomeRethinkDB, self).__init__(*args, **kwargs)
        self._table_names = set()

    def define_table(self, table_name):
        '''Ensures `table_name` will be created when `create_all` is called.
        Returns `r.table(table_name)` object, so a caller could create a
        table object to be used later in the code:

            db = RethinkDB(...)
            users = db.define_table('users')
            db.create_all()
            #...
            users.insert(...)
        '''
        if self._table_names is None:
            raise RethinkDBError('Calls to `define_table` must be made before `create_all` is invoked')
        self._table_names.add(table_name)
        return r.table(table_name)

    def _create_db(self, conn):
        db_name = self.db or current_app.config['RETHINKDB_DB']
        try:
            logger.debug('Creating database: {}'.format(db_name))
            r.db_create(db_name).run(conn)
        except ReqlRuntimeError as error:
            logger.debug('While running db_create: {}'.format(error))

    def _create_tables(self, conn):
        for table_name in self._table_names:
            try:
                logger.debug('Creating table: {}'.format(table_name))
                r.table_create(table_name).run(conn)
            except ReqlOpFailedError as error:
                logger.debug('While running table_create: {}'.format(error))

    def create_all(self):
        conn = self.connect()
        try:
            self._create_db(conn)
            self._create_tables(conn)
        finally:
            conn.close()
        self._table_names = None

db = LabsomeRethinkDB()
