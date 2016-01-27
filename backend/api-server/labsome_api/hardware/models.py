from .. import db

class Object(db.Model):
    _allow_additional_items = True

    slug = db.Field(db.Index(),
                    db.IndexWith('slug_parent', ['parent_id']),
                    db.IndexWith('slug_type', ['type_id']),
                    db.IndexWith('slug_type_parent', ['type_id', 'parent_id']))
    type_id = db.Field(db.Index(), default=None) # Points to Object
    parent_id = db.Field(db.Index(), default=None) # Points to Object
