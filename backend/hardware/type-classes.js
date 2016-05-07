'use strict';

class WarehausTypeClasses {
    constructor() {
        this.typeClasses = {};
    }

    defineTypeClass(typeKey, options) {
        if (this.typeClasses[typeKey]) {
            throw new Error(`${typeKey} is already defined`);
        }
        this.typeClasses[typeKey] = Object.assign({ type_key: typeKey }, options);
    }

    forEach(cb) {
        Object.getOwnPropertyNames(this.typeClasses).forEach(typeKey => cb(this.typeClasses[typeKey]));
    }
}

const warehausTypeClasses = new WarehausTypeClasses();

module.exports = warehausTypeClasses;

// Temporarily define typeclasses from the python backend
// until they're migrated here

warehausTypeClasses.defineTypeClass('builtin-lab', {
    display_name: 'Lab',
    description: '',
    user_controllable: false
});

warehausTypeClasses.defineTypeClass('builtin-server', {
    display_name: 'Server',
    description: ('A physical or virtual machine that will be monitored with an agent. ' +
                  'The agent in installed on the machine as a service and reports back ' +
                  'the status of the machine to Warehaus.'),
    user_controllable: true
});

warehausTypeClasses.defineTypeClass('builtin-server-pci-device', {
    display_name: { singular: 'PCI Device', plural: 'PCI Devices' },
    description: '',
    user_controllable: false
});

warehausTypeClasses.defineTypeClass('builtin-server-network-interface', {
    display_name: { singular: 'Network Interface', plural: 'Network Interfaces' },
    description: '',
    user_controllable: false
});

warehausTypeClasses.defineTypeClass('builtin-server-disk', {
    display_name: { singular: 'Disk', plural: 'Disks' },
    description: '',
    user_controllable: false
});

warehausTypeClasses.defineTypeClass('builtin-cluster', {
    display_name: 'Cluster',
    description: ('A cluster can gather multiple servers together. ' +
                  'This is useful to change ownership in bulk and ' +
                  'get the configuration of all servers in the ' +
                  'cluster with one API call.'),
    user_controllable: true
});

warehausTypeClasses.defineTypeClass('builtin-generic-object', {
    display_name: 'Generic Object',
    description: ("A plain object type with user attributes. This type " +
                  "should be used when you want to store objects that " +
                  "don't fit any other available type."),
    user_controllable: true
});
