from .type_class import TypeClass

class TypeClassesRegistry(object):
    def __init__(self):
        super(TypeClassesRegistry, self).__init__()
        self._type_classes = {}

    def register_type(self, type_class):
        if not isinstance(type_class, TypeClass):
            raise TypeError('You can only register subclasses of TypeClass')
        self._type_classes[type_class.type_key()] = type_class

    def __iter__(self):
        return self._type_classes.itervalues()

    def __getitem__(self, item):
        if item in self._type_classes:
            return self._type_classes[item]
        raise KeyError('No such type with key {!r}'.format(item))

all_type_classes = TypeClassesRegistry()

# XXX register automatically with a metaclass

from .labs import Lab
from .servers import Server
from .servers import PciDevice
from .servers import NetworkInterface
from .servers import Disk
from .clusters import Cluster
from .generic_object import GenericObject

all_type_classes.register_type(Lab())
all_type_classes.register_type(Server())
all_type_classes.register_type(PciDevice())
all_type_classes.register_type(NetworkInterface())
all_type_classes.register_type(Disk())
all_type_classes.register_type(Cluster())
all_type_classes.register_type(GenericObject())
