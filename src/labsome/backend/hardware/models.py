from .. import db

class Lab(db.Model):
    name         = db.Field(db.Index())
    active_types = db.Field()
    type_naming  = db.Field()

class Object(db.Model):
    _allow_additional_items = True

    type_key = db.Field(db.Index(), db.IndexWith('type_name_lab', ['name', 'lab_id']))
    name     = db.Field(db.Index())
    lab_id   = db.Field(db.Index())
