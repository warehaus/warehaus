from .hardware_type import HardwareType
from .servers import Server
from .clusters import Cluster

class HardwareTypesRegistry(object):
    def __init__(self):
        super(HardwareTypesRegistry, self).__init__()
        self._hardware_types = {}

    def register_type(self, hardware_type):
        if not issubclass(hardware_type, HardwareType):
            raise TypeError('You can only register subclasses of HardwareType')
        self._hardware_types[hardware_type.type_key()] = hardware_type

    def register_api(self, app_or_blueprint):
        for hardware_type in self._hardware_types.itervalues():
            url_prefix = '/{}/{}'.format(hardware_type.TYPE_VENDOR, hardware_type.TYPE_NAME)
            hardware_type.register_api(app_or_blueprint, url_prefix)

    def __iter__(self):
        return self._hardware_types.itervalues()

    def __getitem__(self, item):
        if item in self._hardware_types:
            return self._hardware_types[item]
        raise AttributeError('No such type with key {!r}'.format(item))

all_types = HardwareTypesRegistry()
all_types.register_type(Server)
all_types.register_type(Cluster)
