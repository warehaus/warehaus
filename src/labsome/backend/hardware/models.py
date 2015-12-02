from ..db import Model

class Lab(Model):
    _indexes = {
        'name': ['name'],
    }

class Type(Model):
    _indexes = {
        'name': ['name'],
    }

class Object(Model):
    _indexes = {
        'name': ['name'],
        'lab_id': ['lab_id'],
        'type_id': ['type_id'],
        'name_type_lab': ['name', 'type_id', 'lab_id'],
    }
