from flask_socketio import SocketIO
from flask.ext.login import current_user
from .db.models import db_object_changed
from .db.models import db_object_deleted

socketio = SocketIO()

@socketio.on('connect')
def connect_handler():
    if not current_user.is_authenticated:
        return False

@db_object_changed.connect
def broadcast_object_changed_message(sender, table_name, id):
    socketio.emit('object_changed:{}'.format(table_name), dict(id=id))

@db_object_deleted.connect
def broadcast_object_deleted_message(sender, table_name, id):
    socketio.emit('object_deleted:{}'.format(table_name), dict(id=id))
