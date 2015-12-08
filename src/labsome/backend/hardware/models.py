from .. import db

class Lab(db.Model):
    slug         = db.Field(db.Index())
    display_name = db.Field()
    active_types = db.Field()
    type_naming  = db.Field()

    @classmethod
    def get_by_slug(cls, slug):
        docs = tuple(cls.query.get_all(slug, index='slug'))
        if not docs:
            return None
        if len(docs) != 1:
            raise RuntimeError('Found more than one lab with slug={!r}'.format(slug))
        return docs[0]

class Object(db.Model):
    _allow_additional_items = True

    type_key     = db.Field(db.Index(), db.IndexWith('type_slug_lab', ['slug', 'lab_id']))
    slug         = db.Field(db.Index())
    display_name = db.Field(db.Index())
    lab_id       = db.Field(db.Index())
