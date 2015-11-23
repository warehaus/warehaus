import uuid
from sqlalchemy_utils import Timestamp
from sqlalchemy_utils import UUIDType
from sqlalchemy_utils import JSONType
from ..db import db

class Lab(db.Model, Timestamp):
    id   = db.Column(UUIDType, primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(128), unique=True, nullable=False)

class Object(db.Model, Timestamp):
    id     = db.Column(UUIDType, primary_key=True, default=uuid.uuid4)
    lab_id = db.Column(UUIDType, db.ForeignKey(Lab.id), nullable=False)
    name   = db.Column(db.String(1024), nullable=False)
    type   = db.Column(db.String(128), nullable=False)
    data   = db.Column(JSONType, default=lambda: {})
