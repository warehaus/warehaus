import os
import time
import requests
from urlparse import urljoin
from subprocess import Popen, PIPE
from .warehaus_test_base import WarehausApiTestBase

class ServerTests(WarehausApiTestBase):
    def test_server_operations(self):
        '''Test server type creation, agent downloading and running heartbeat
        for creating servers.
        '''
        with self.temp_lab() as lab:
            server_type_path = self.create_type_object(lab, type_key='builtin-server', slug='srvr',
                                                       name_singular='Server', name_plural='Servers')
            servers_before = self.api_server.get(urljoin(server_type_path, 'objects'))
            self.assertEqual(len(servers_before['objects']), 0)
            agent_code = self.get_agent_code(server_type_path)
            self.run_agent(agent_code)
            servers_after = self.api_server.get(urljoin(server_type_path, 'objects'))
            self.assertEqual(len(servers_after['objects']), 1)

    def get_agent_code(self, server_type_path):
        agent_response = requests.get(urljoin(self.api_server.app_url(server_type_path), 'agent.py'))
        agent_response.raise_for_status()
        heartbeat_response = requests.get(urljoin(self.api_server.app_url(server_type_path), 'heartbeat.py'))
        heartbeat_response.raise_for_status()
        return agent_response.text

    def run_agent(self, agent_code):
        env = dict(os.environ)
        env['WAREHAUS_AGENT_LOGGING'] = 'STDOUT'
        agent_proc = Popen(['/usr/bin/python', '-', 'once'], stdin=PIPE, stdout=PIPE, stderr=PIPE, env=env)
        stdout, stderr = agent_proc.communicate(agent_code)
        agent_exit_code = agent_proc.wait()
        if agent_exit_code != 0:
            self.fail('Agent crashed\n\nstdout: {}\n\nstderr: {}'.format(stdout, stderr))
