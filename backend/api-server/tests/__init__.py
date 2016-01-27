from unittest import TestSuite
from unittest import makeSuite
from .api_tests import LabsomeApiTest
from labsome_api.logs import log_to_console

def suite():
    log_to_console()
    suite = TestSuite()
    suite.addTest(makeSuite(LabsomeApiTest))
    return suite
