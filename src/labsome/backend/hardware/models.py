from .. import db

class Lab(db.Model):
    name         = db.Field(db.Index())
    active_types = db.Field()
    type_naming  = db.Field()

class Type(db.Model):
    name = db.Field(db.Index())

    @classmethod
    def get_by_name(cls, name):
        docs = tuple(cls.query.get_all(name, index='name'))
        if not docs:
            obj = cls(name=name)
            obj.save()
            return obj
        if len(docs) != 1:
            raise RuntimeError('Found more than one user with name={!r}'.format(name))
        return docs[0]

class Object(db.Model):
    _allow_additional_items = True

    name    = db.Field(db.IndexWith('name_type_lab', ['type_id', 'lab_id']))
    type_id = db.Field()
    lab_id  = db.Field()
