from unittest import TestSuite
from unittest import makeSuite
from warehaus_api.logs import log_to_console
from .state_api_test import StateApiTest
from .type_system_tests import TypeSystemTests
from .cluster_tests import ClusterTests
from .server_tests import ServerTests

TEST_CLASSES = (
    StateApiTest,
    TypeSystemTests,
    ClusterTests,
    ServerTests,
)

def suite():
    log_to_console()
    suite = TestSuite()
    for test_class in TEST_CLASSES:
        suite.addTest(makeSuite(test_class))
    return suite
