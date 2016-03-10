import requests
from .warehaus_test_base import WarehausApiTestBase

class StateApiTest(WarehausApiTestBase):
    def test_state_api(self):
        '''Calls /api/v1/state with and without an authorization token.'''
        without_auth = requests.get(self.app_url('/api/v1/state')).json()
        with_auth = self.get('/api/v1/state')
