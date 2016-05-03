import os
import requests
from urlparse import urljoin
from subprocess import Popen, PIPE

def get_agent_code(warehaus, server_type_path):
    agent_response = requests.get(urljoin(warehaus.api.app_url(server_type_path), 'agent.py'))
    agent_response.raise_for_status()
    heartbeat_response = requests.get(urljoin(warehaus.api.app_url(server_type_path), 'heartbeat.py'))
    heartbeat_response.raise_for_status()
    return agent_response.text

def run_agent(agent_code):
    env = dict(os.environ)
    env['WAREHAUS_AGENT_LOGGING'] = 'STDOUT'
    agent_proc = Popen(['/usr/bin/python', '-', 'once'], stdin=PIPE, stdout=PIPE, stderr=PIPE, env=env)
    stdout, stderr = agent_proc.communicate(agent_code)
    agent_exit_code = agent_proc.wait()
    assert agent_exit_code == 0, 'Agent crashed\n\nstdout: {}\n\nstderr: {}'.format(stdout, stderr)

def test_server_operations(warehaus):
    '''Test server type creation, agent downloading and running heartbeat
    for creating servers.
    '''
    with warehaus.temp_lab() as lab:
        server_type_path = warehaus.create_type_object(lab, type_key='builtin-server', slug='srvr',
                                                       name_singular='Server', name_plural='Servers')
        servers_before = warehaus.api.get(urljoin(server_type_path, 'objects'))
        assert len(servers_before['objects']) == 0
        agent_code = get_agent_code(warehaus, server_type_path)
        for _ in xrange(5):
            run_agent(agent_code)
            servers_after = warehaus.api.get(urljoin(server_type_path, 'objects'))
            assert len(servers_after['objects']) == 1
