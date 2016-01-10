from logging import getLogger
from flask import current_app
from flask_socketio import SocketIO
from .db.models import db_object_changed
from .db.models import db_object_deleted

logger = getLogger(__name__)

socketio = SocketIO()

@db_object_changed.connect
def broadcast_object_changed_message(sender, table_name, id):
    socketio.emit('object_changed:{}'.format(table_name), dict(id=id))

@db_object_deleted.connect
def broadcast_object_deleted_message(sender, table_name, id):
    socketio.emit('object_deleted:{}'.format(table_name), dict(id=id))
