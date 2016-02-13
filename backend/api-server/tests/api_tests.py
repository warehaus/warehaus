import time
import random
import httplib
import unittest
import requests
import itertools
from logging import getLogger
from urlparse import urljoin
from subprocess import Popen
from contextlib import contextmanager
from labsome_api.app import create_app
from .restful_test_base import AuthorizedRestfulTestBase
from .proc_utils import terminated
from .proc_utils import deleted_tempfile

logger = getLogger(__name__)

lab_num = itertools.count()

class LabsomeApiTestBase(AuthorizedRestfulTestBase):
    def create_app(self):
        return create_app(TESTING=True)

    def get_labs(self):
        return self.get('/api/v1/labs')['labs']

    def create_lab(self, slug):
        return self.post('/api/v1/labs', dict(slug=slug, display_name=slug.title()))

    def delete_lab(self, lab_slug, expected_status=httplib.NO_CONTENT):
        return self.delete('/api/v1/labs/{}/'.format(lab_slug), expected_status=expected_status)

    def create_type_object(self, lab, type_key, slug, name_singular, name_plural, **kwargs):
        self.post('/api/v1/labs/{}/type-objects'.format(lab['slug']), dict(
            type_key = type_key,
            slug     = slug,
            display_name = dict(
                singular = name_singular,
                plural   = name_plural,
            ),
        ), **kwargs)
        return '/api/v1/labs/{}/~/{}/'.format(lab['slug'], slug)

    @contextmanager
    def temp_lab(self):
        lab_slug = 'asdf' + str(lab_num.next())
        if any(lab['slug'] == lab_slug for lab in self.get_labs()):
            self.delete_lab(lab_slug)
        self.delete_lab(lab_slug, expected_status=httplib.NOT_FOUND)
        before_lab_creation = self.get_labs()
        lab = self.create_lab(lab_slug)
        after_lab_creation = self.get_labs()
        self.assertEqual(len(before_lab_creation) + 1, len(after_lab_creation))
        assert any(lab['slug'] == lab_slug for lab in after_lab_creation), after_lab_creation
        yield lab
        self.delete_lab(lab_slug)
        after_lab_deletion = self.get_labs()
        self.assertEqual(len(before_lab_creation), len(after_lab_deletion))
        assert all(lab['slug'] != lab_slug for lab in after_lab_deletion), after_lab_deletion

class LabsomeApiTest(LabsomeApiTestBase):
    def test_state_api(self):
        '''Calls /api/v1/state with and without an authorization token.'''
        without_auth = requests.get(self.app_url('/api/v1/state')).json()
        with_auth = self.get('/api/v1/state')

    def test_type_classes_api(self):
        '''Gets the supported type classes.'''
        self.get('/api/v1/hardware/types')

    def test_create_delete_lab(self):
        '''Create and delete some labs.'''
        with self.temp_lab() as lab:
            pass
        with self.temp_lab() as lab:
            pass
        with self.temp_lab() as lab:
            with self.temp_lab() as lab:
                pass

    def test_type_objects(self):
        '''Create and delete type objects, see that we can query
        them through the APIs.
        '''
        type_names = [
            'Hanh', 'Frederick',
            'Melody', 'Mignon',
            'Ora', 'Marguerite',
            'Horacio', 'Mendy',
            'Faith', 'Sharyn',
        ]
        with self.temp_lab() as lab:
            type_urls = tuple(
                self.create_type_object(lab,
                                        type_key      = 'builtin-cluster',
                                        slug          = type_name.lower(),
                                        name_singular = type_name,
                                        name_plural   = type_name + 's')
                for type_name in type_names)
            types = tuple(self.get(type_url) for type_url in type_urls)
            children = self.get('/api/v1/labs/{}/~/children'.format(lab['slug']))['children']
            self.assertEqual(set(typeobj['id'] for typeobj in types),
                             set(child['id'] for child in children))
            for type_name in type_names:
                self.delete('/api/v1/labs/{}/~/{}/'.format(lab['slug'], type_name.lower()))

    def test_type_objects_with_same_slug(self):
        '''Try to create two type objects with the same slug:
        - In the same lab: should fail
        - In different labs: should succeed
        '''
        type_name = 'Horacio'
        fixed_kwargs = dict(
            type_key      = 'builtin-server',
            slug          = type_name.lower(),
            name_singular = type_name,
            name_plural   = type_name + 's',
        )
        with self.temp_lab() as lab1:
            self.create_type_object(lab1, **fixed_kwargs)
            self.create_type_object(lab1, expected_status=httplib.CONFLICT, **fixed_kwargs)
            with self.temp_lab() as lab2:
                self.create_type_object(lab2, **fixed_kwargs)

    def test_cluster_operations(self):
        '''Create and delete some clusters in labs:
        - Create two cluster types.
        - Create some clusters of the two different types.
        - Ensure that cluster names are unique within the lab.
        - Ensure that clusters are created with their correct type.
        '''
        with self.temp_lab() as lab:
            cluster1_type_path = self.create_type_object(lab, type_key='builtin-cluster', slug='cluster1',
                                                         name_singular='Cluster', name_plural='Clusters')
            cluster2_type_path = self.create_type_object(lab, type_key='builtin-cluster', slug='cluster2',
                                                         name_singular='Cluster', name_plural='Clusters')
            cluster1_1 = self.post(cluster1_type_path, dict(display_name='First of first'))
            cluster1_2 = self.post(cluster1_type_path, dict(display_name='Second of first'))
            cluster2_1 = self.post(cluster2_type_path, dict(display_name='First of second'))
            self.assertEqual(len(self.get(urljoin(cluster1_type_path, 'objects'))['objects']), 2)
            self.assertEqual(len(self.get(urljoin(cluster2_type_path, 'objects'))['objects']), 1)
            self.post(cluster2_type_path, dict(display_name='First of first'), expected_status=httplib.CONFLICT)
            self.delete('/api/v1/labs/{}/first-of-first/'.format(lab['slug']))
            self.delete('/api/v1/labs/{}/first-of-first/'.format(lab['slug']), expected_status=httplib.NOT_FOUND)
            self.assertEqual(len(self.get(urljoin(cluster1_type_path, 'objects'))['objects']), 1)
            self.assertEqual(len(self.get(urljoin(cluster2_type_path, 'objects'))['objects']), 1)
            self.get('/api/v1/labs/{}/second-of-first/config.json'.format(lab['slug']))

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

    def test_ownership(self):
        '''Assign and remove ownerships from clusters.'''
        with self.temp_lab() as lab:
            cluster_type = self.create_type_object(lab, type_key='builtin-cluster', slug='cluster',
                                                   name_singular='Cluster', name_plural='Clusters')
            cluster = self.post(cluster_type, dict(display_name='Mendy'))
            cluster_url = '/api/v1/labs/{}/{}/'.format(lab['slug'], cluster['slug'])
            config = self.get(urljoin(cluster_url, 'config.json'))
            self.assertEqual(len(config['ownerships']), 0)
            self.delete(urljoin(cluster_url, 'owner')) # Does nothing but should succeed
            self.post(urljoin(cluster_url, 'owner'), dict(username='admin'))
            config = self.get(urljoin(cluster_url, 'config.json'))
            self.assertEqual(len(config['ownerships']), 1)
            self.post(urljoin(cluster_url, 'owner'), dict(username='nosuchuser'), expected_status=httplib.BAD_REQUEST)
            self.post(urljoin(cluster_url, 'owner'), dict(username='user'), expected_status=httplib.CONFLICT)
            self.delete(urljoin(cluster_url, 'owner'))
            config = self.get(urljoin(cluster_url, 'config.json'))
            self.assertEqual(len(config['ownerships']), 0)

    def test_server_cluster_assignment(self):
        '''Assign servers to clusters.'''
        NUM_SERVERS = 5
        with self.temp_lab() as lab:
            server_type = self.create_type_object(lab, type_key='builtin-server', slug='server',
                                                  name_singular='Server', name_plural='Servers')
            cluster_type = self.create_type_object(lab, type_key='builtin-cluster', slug='cluster',
                                                   name_singular='Cluster', name_plural='Clusters')
            for i in range(NUM_SERVERS):
                hostname = 'srvr{}'.format(i)
                self.post(urljoin(server_type, 'heartbeat'),
                          dict(hostname=hostname, net={}, pci_devices={}, block_devices={}),
                          expected_status=httplib.OK)
            self.assertEqual(len(self.get(urljoin(server_type, 'objects'))['objects']), NUM_SERVERS)
            cluster = self.post(cluster_type, dict(display_name='Some Cluster'))
            config = self.get('/api/v1/labs/{}/some-cluster/config.json'.format(lab['slug']))
            self.assertEqual(len(config['servers']), 0)
            random_server = 'srvr{}'.format(random.randrange(NUM_SERVERS))
            self.put('/api/v1/labs/{}/{}/cluster'.format(lab['slug'], random_server), dict(cluster_id=cluster['id']))

if __name__ == '__main__':
    unittest.main()
