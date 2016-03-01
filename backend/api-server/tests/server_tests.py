import time
import requests
from urlparse import urljoin
from subprocess import Popen
from .proc_utils import terminated
from .proc_utils import deleted_tempfile
from .labsome_test_base import LabsomeApiTestBase

class ServerTests(LabsomeApiTestBase):
    def test_server_operations(self):
        '''Test server type creation, agent downloading and running heartbeat
        for creating servers.
        '''
        with self.temp_lab() as lab:
            server_type_path = self.create_type_object(lab, type_key='builtin-server', slug='srvr',
                                                       name_singular='Server', name_plural='Servers')
            servers_before = self.get(urljoin(server_type_path, 'objects'))
            self.assertEqual(len(servers_before['objects']), 0)
            agent_response = requests.get(urljoin(self.app_url(server_type_path), 'agent.py'))
            agent_response.raise_for_status()
            requests.get(urljoin(self.app_url(server_type_path), 'heartbeat.py')).raise_for_status()
            with deleted_tempfile(agent_response.text) as agent_file:
                with terminated(Popen(['/usr/bin/python', '-'], stdin=agent_file)):
                    for _ in range(10):
                        servers_after = self.get(urljoin(server_type_path, 'objects'))
                        if len(servers_after['objects']) > 0:
                            break
                        time.sleep(0.1)
                    else:
                        self.fail('Timed out waiting for server to be created')
