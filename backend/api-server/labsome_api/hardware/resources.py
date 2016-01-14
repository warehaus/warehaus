import httplib
from flask import request
from flask import abort as flask_abort
from flask_restful import Resource
from ..auth import user_required
from ..auth import admin_required
from .models import Lab
from .models import Object
from .all_types import all_types

#----------------------------------------------------------#
# Labs                                                     #
#----------------------------------------------------------#

class AllLabs(Resource):
    @user_required
    def get(self):
        return dict(objects=tuple(lab.as_dict() for lab in Lab.query.all()))

    @admin_required
    def post(self):
        lab = Lab(**request.json)
        lab.save()
        return lab.as_dict(), httplib.CREATED

def get_lab(lab_id):
    lab = Lab.query.get(lab_id)
    if lab is None:
        flask_abort(httplib.NOT_FOUND)
    return lab

class SingleLab(Resource):
    @user_required
    def get(self, lab_id):
        return get_lab(lab_id).as_dict()

    @admin_required
    def put(self, lab_id):
        lab = get_lab(lab_id)
        lab.update(**request.json)
        lab.save()
        return lab.as_dict(), httplib.ACCEPTED

    @admin_required
    def delete(self, lab_id):
        lab = get_lab(lab_id)
        lab.delete()
        return lab.as_dict(), httplib.NO_CONTENT

#----------------------------------------------------------#
# Types                                                    #
#----------------------------------------------------------#

class Types(Resource):
    @user_required
    def get(self):
        return dict(types=[dict(
            type_key     = hardware_type.type_key(),
            display_name = hardware_type.display_name(),
        ) for hardware_type in all_types])

#----------------------------------------------------------#
# Objects                                                  #
#----------------------------------------------------------#

def get_object(obj_id):
    obj = Object.query.get(obj_id)
    if obj is None:
        flask_abort(httplib.NOT_FOUND)
    return obj

class AllObjects(Resource):
    @user_required
    def get(self):
        return dict(objects=tuple(obj.as_dict() for obj in Object.query.all()))

class SingleObject(Resource):
    @user_required
    def get(self, obj_id):
        return get_object(obj_id).as_dict()
