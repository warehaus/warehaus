from flask import Blueprint
from flask import jsonify
from ..db import register_resource
from ..auth import user_required
from ..auth import admin_required
from .models import Lab
from .models import Object
from .all_types import all_types
from .ownership import register_ownership_api

hardware_api = Blueprint('hardware_api', __name__)

register_resource(hardware_api, Lab, url_prefix='/labs',
                  create=True, read=True, read_single=True,
                  update_single=True, delete_single=True,
                  create_decorators = [admin_required],
                  read_decorators   = [user_required],
                  update_decorators = [admin_required],
                  delete_decorators = [admin_required])

register_resource(hardware_api, Object, url_prefix='/objects',
                  read=True, read_single=True,
                  read_decorators=[user_required])

@hardware_api.route('/types')
def get_hardware_types():
    return jsonify(types=[dict(
        type_key     = hardware_type.type_key(),
        display_name = hardware_type.display_name(),
    ) for hardware_type in all_types])

all_types.register_api(hardware_api)
register_ownership_api(hardware_api)
