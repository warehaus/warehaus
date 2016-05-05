import random
import httplib
from urlparse import urljoin

def test_cluster_operations(warehaus):
    '''Create and delete some clusters in labs:
    - Create two cluster types.
    - Create some clusters of the two different types.
    - Ensure that cluster names are unique within the lab.
    - Ensure that clusters are created with their correct type.
    '''
    with warehaus.temp_lab() as lab:
        cluster1_type_path = warehaus.create_type_object(lab, type_key='builtin-cluster', slug='cluster1',
                                                         name_singular='Cluster', name_plural='Clusters')
        cluster2_type_path = warehaus.create_type_object(lab, type_key='builtin-cluster', slug='cluster2',
                                                         name_singular='Cluster', name_plural='Clusters')
        warehaus.api.post(cluster1_type_path, dict(display_name='First of first'))
        warehaus.api.post(cluster1_type_path, dict(display_name='Second of first'))
        warehaus.api.post(cluster2_type_path, dict(display_name='First of second'))
        assert len(warehaus.api.get(urljoin(cluster1_type_path, 'objects'))['objects']) == 2
        assert len(warehaus.api.get(urljoin(cluster2_type_path, 'objects'))['objects']) == 1
        warehaus.api.post(cluster2_type_path, dict(display_name='First of first'), expected_status=httplib.CONFLICT)
        warehaus.api.delete('/api/v1/labs/{}/first-of-first/'.format(lab['slug']))
        warehaus.api.delete('/api/v1/labs/{}/first-of-first/'.format(lab['slug']), expected_status=httplib.NOT_FOUND)
        assert len(warehaus.api.get(urljoin(cluster1_type_path, 'objects'))['objects']) == 1
        assert len(warehaus.api.get(urljoin(cluster2_type_path, 'objects'))['objects']) == 1
        warehaus.api.get('/api/v1/labs/{}/second-of-first/config.json'.format(lab['slug']))

def test_ownership(warehaus):
    '''Assign and remove ownerships from clusters.'''
    with warehaus.temp_lab() as lab:
        cluster_type = warehaus.create_type_object(lab, type_key='builtin-cluster', slug='cluster',
                                                   name_singular='Cluster', name_plural='Clusters')
        cluster = warehaus.api.post(cluster_type, dict(display_name='Mendy'))
        cluster_url = '/api/v1/labs/{}/{}/'.format(lab['slug'], cluster['slug'])
        config = warehaus.api.get(urljoin(cluster_url, 'config.json'))
        assert len(config['ownerships']) == 0
        warehaus.api.delete(urljoin(cluster_url, 'owner')) # Does nothing but should succeed
        warehaus.api.post(urljoin(cluster_url, 'owner'), dict(username='admin'))
        config = warehaus.api.get(urljoin(cluster_url, 'config.json'))
        assert len(config['ownerships']) == 1
        warehaus.api.post(urljoin(cluster_url, 'owner'), dict(username='nosuchuser'), expected_status=httplib.BAD_REQUEST)
        warehaus.api.post(urljoin(cluster_url, 'owner'), dict(username='user'), expected_status=httplib.CONFLICT)
        warehaus.api.delete(urljoin(cluster_url, 'owner'))
        config = warehaus.api.get(urljoin(cluster_url, 'config.json'))
        assert len(config['ownerships']) == 0

def test_server_cluster_assignment(warehaus):
    '''Assign servers to clusters.'''
    NUM_SERVERS = 5
    with warehaus.temp_lab() as lab:
        server_type = warehaus.create_type_object(lab, type_key='builtin-server', slug='server',
                                                  name_singular='Server', name_plural='Servers')
        cluster_type = warehaus.create_type_object(lab, type_key='builtin-cluster', slug='cluster',
                                                   name_singular='Cluster', name_plural='Clusters')
        for i in range(NUM_SERVERS):
            hostname = 'srvr{}'.format(i)
            warehaus.api.post(urljoin(server_type, 'heartbeat'),
                              dict(hostname=hostname, info={}),
                              expected_status=httplib.OK)
        assert len(warehaus.api.get(urljoin(server_type, 'objects'))['objects']) == NUM_SERVERS
        cluster = warehaus.api.post(cluster_type, dict(display_name='Some Cluster'))
        config = warehaus.api.get('/api/v1/labs/{}/some-cluster/config.json'.format(lab['slug']))
        assert len(config['servers']) == 0
        random_server = 'srvr{}'.format(random.randrange(NUM_SERVERS))
        warehaus.api.put('/api/v1/labs/{}/{}/cluster'.format(lab['slug'], random_server), dict(cluster_id=cluster['id']))

def test_cluster_status(warehaus):
    with warehaus.temp_lab() as lab:
        cluster_type = warehaus.create_type_object(lab, type_key='builtin-cluster', slug='cluster',
                                                   name_singular='Cluster', name_plural='Clusters')
        cluster = warehaus.api.post(cluster_type, dict(display_name='Some Cluster'))
        cluster_uri = '/api/v1/labs/{}/some-cluster'.format(lab['slug'])
        config = warehaus.api.get(cluster_uri + '/config.json')
        assert config['status'] is None
        warehaus.api.put(cluster_uri + '/status', dict(), expected_status=httplib.BAD_REQUEST)
        warehaus.api.put(cluster_uri + '/status', dict(blah='1'), expected_status=httplib.BAD_REQUEST)
        warehaus.api.put(cluster_uri + '/status', dict(text='1', in_progress=True, extra=3), expected_status=httplib.BAD_REQUEST)
        new_status = dict(text='Testing status')
        warehaus.api.put(cluster_uri + '/status', dict(status=new_status))
        config = warehaus.api.get(cluster_uri + '/config.json')
        assert config['status']['text'] == new_status['text']
        assert config['status']['in_progress'] == False
        assert 'modified_at' in config['status']
        assert 'modified_by' in config['status']
        warehaus.api.delete(cluster_uri + '/status')
        config = warehaus.api.get(cluster_uri + '/config.json')
        assert config['status'] is None
