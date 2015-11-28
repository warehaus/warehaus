import uuid
from sqlalchemy_utils import Timestamp
from sqlalchemy_utils import UUIDType
from sqlalchemy_utils import JSONType
from ..db import db

class Lab(db.Model, Timestamp):
    id    = db.Column(UUIDType, primary_key=True, default=uuid.uuid4)
    name  = db.Column(db.String(128), unique=True, nullable=False)
    types = db.Column(JSONType, default=lambda: {})

class ObjectType(db.Model, Timestamp):
    id     = db.Column(UUIDType, primary_key=True, default=uuid.uuid4)
    name   = db.Column(db.String(128), unique=True, nullable=False)
    schema = db.Column(JSONType, default=lambda: {})

class Object(db.Model, Timestamp):
    id     = db.Column(UUIDType, primary_key=True, default=uuid.uuid4)
    lab_id = db.Column(UUIDType, db.ForeignKey(Lab.id), nullable=False)
    type   = db.Column(UUIDType, db.ForeignKey(ObjectType.id), nullable=False)
    name   = db.Column(db.String(1024), nullable=False)
    data   = db.Column(JSONType, default=lambda: {})

def _ensure_basic_hardware_types():
    for name in ('server', 'cluster'):
        object_type = ObjectType.query.filter_by(name=name).first()
        if object_type is None:
            object_type = ObjectType(name=name)
            db.session.add(object_type)
    db.session.commit()
