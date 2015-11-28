from flask import Blueprint
from flask.json import jsonify
from ..auth import user_required
from ..auth import admin_required
from .models import Lab
from .models import ObjectType
from .models import Object

HARDWARE_URL_PREFIX = '/api/hardware/v1'

def register_hardware_api(api_manager):
    api_manager.create_api(Lab, methods=['GET', 'POST', 'PUT', 'DELETE'],
                           url_prefix=HARDWARE_URL_PREFIX, collection_name='labs',
                           preprocessors=dict(
                               POST          = [admin_required],
                               GET_SINGLE    = [user_required],
                               GET_MANY      = [user_required],
                               PUT_SINGLE    = [admin_required],
                               PUT_MANY      = [admin_required],
                               DELETE_SINGLE = [admin_required],
                               DELETE_MANY   = [admin_required],
                           ))

    api_manager.create_api(ObjectType, methods=['GET'],
                           url_prefix=HARDWARE_URL_PREFIX, collection_name='types',
                           preprocessors=dict(
                               GET_SINGLE = [user_required],
                               GET_MANY   = [user_required],
                           ))

    api_manager.create_api(Object, methods=['GET', 'POST', 'PUT', 'DELETE'],
                           url_prefix=HARDWARE_URL_PREFIX, collection_name='objects',
                           preprocessors=dict(
                               POST          = [admin_required],
                               GET_SINGLE    = [user_required],
                               GET_MANY      = [user_required],
                               PUT_SINGLE    = [admin_required],
                               PUT_MANY      = [admin_required],
                               DELETE_SINGLE = [admin_required],
                               DELETE_MANY   = [admin_required],
                           ))
