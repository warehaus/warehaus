from .type_class import TypeClass

class TypeClassesRegistry(object):
    def __init__(self):
        super(TypeClassesRegistry, self).__init__()
        self._type_classes = {}

    def register_type(self, type_class):
        if not isinstance(type_class, TypeClass):
            raise TypeError('You can only register subclasses of TypeClass')
        self._type_classes[type_class.type_key()] = type_class

    def register_api(self, app_or_blueprint):
        for type_class in self._type_classes.itervalues():
            url_prefix = '/' + type_class.type_key()
            type_class.register_api(app_or_blueprint, url_prefix)

    def __iter__(self):
        return self._type_classes.itervalues()

    def __getitem__(self, item):
        if item in self._type_classes:
            return self._type_classes[item]
        raise KeyError('No such type with key {!r}'.format(item))

all_type_classes = TypeClassesRegistry()

from .labs import Lab
from .servers import Server
from .clusters import Cluster

all_type_classes.register_type(Lab())
all_type_classes.register_type(Server())
all_type_classes.register_type(Cluster())
