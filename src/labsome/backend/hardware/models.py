from .. import db

class Lab(db.Model):
    name         = db.Field(db.Index())
    active_types = db.Field()
    type_naming  = db.Field()

    @classmethod
    def get_by_name(cls, name):
        docs = tuple(cls.query.get_all(name, index='name'))
        if not docs:
            return None
        if len(docs) != 1:
            raise RuntimeError('Found more than one lab with name={!r}'.format(name))
        return docs[0]

class Object(db.Model):
    _allow_additional_items = True

    type_key = db.Field(db.Index(), db.IndexWith('type_name_lab', ['name', 'lab_id']))
    name     = db.Field(db.Index())
    lab_id   = db.Field(db.Index())
