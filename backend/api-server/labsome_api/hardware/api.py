from flask import Blueprint
from .all_types import all_types
from .ownership import register_ownership_api

hardware_api = Blueprint('hardware_api', __name__)

all_types.register_api(hardware_api)
register_ownership_api(hardware_api)
