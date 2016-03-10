import random
import httplib
from urlparse import urljoin
from .warehaus_test_base import WarehausApiTestBase

class ClusterTests(WarehausApiTestBase):
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
