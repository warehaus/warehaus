from flask import Blueprint
from ..db import register_resource
from ..auth import user_required
from ..auth import admin_required
from .models import Lab
from .models import Object

hardware_api = Blueprint('hardware_api', __name__)

register_resource(hardware_api, Lab, url_prefix='/v1/labs',
                  create=True, read=True, read_single=True,
                  update_single=True, delete_single=True,
                  create_decorators = [admin_required],
                  read_decorators   = [user_required],
                  update_decorators = [admin_required],
                  delete_decorators = [admin_required])

register_resource(hardware_api, Object, url_prefix='/v1/objects',
                  read=True, read_single=True,
                  read_decorators=[user_required])
