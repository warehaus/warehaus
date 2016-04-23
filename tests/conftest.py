import os
import time
import httplib
import unittest
import httplib
import itertools
import requests
import docker
import pytest
from logging import getLogger
from urlparse import urljoin
from contextlib import contextmanager

logger = getLogger(__name__)

lab_num = itertools.count()

class CurrentUser(object):
    def __init__(self, api):
        super(CurrentUser, self).__init__()
        self.api = api
        self.identities = []

    def get(self):
        return self.identities[-1] if self.identities else None

    def auth_headers(self):
        if not self.identities or not self.identities[-1]['method']:
            return {}
        if self.identities[-1]['method'] == 'login':
            return {'Authorization': 'JWT {}'.format(self.identities[-1]['jwt_token'])}
        if self.identities[-1]['method'] == 'token':
            return {'Authentication-Token': self.identities[-1]['auth_token']}
        raise ValueError('Unknown method for current identity {!r}'.format(self.identities[-1]))

    def push(self, method, credentials):
        if method is None:
            self.identities.append(dict(method=None))
        elif method == 'login':
            login_res = self.api.post('/api/auth/login/local', credentials, expected_status=httplib.OK)
            self.identities.append(dict(method='login', jwt_token=login_res['access_token']))
        elif method == 'token':
            self.identities.append(dict(method='token', auth_token=credentials))
        else:
            raise ValueError('Unknown method {!r}'.format(method))

    def pop(self):
        self.identities.pop()

    @contextmanager
    def __call__(self, method, credentials):
        self.push(method, credentials)
        try:
            yield
        finally:
            self.pop()

class RestfulAPI(object):
    def __init__(self, url):
        super(RestfulAPI, self).__init__()
        self._url = url
        self.current_user = CurrentUser(self)

    def app_url(self, path=None):
        if path is None:
            return self._url
        return urljoin(self._url, path)

    def _call(self, method, path, expected_status=httplib.OK, *args, **kwargs):
        headers = kwargs.pop('headers', {})
        headers.update(self.current_user.auth_headers())
        url = self.app_url(path)
        response = method(url, headers=headers, *args, **kwargs)
        assert response.status_code == expected_status, 'URL: {}, EXPECTED: {}, GOT: {}, DATA: {}'.format(
            url, expected_status, response.status_code, response.text)
        try:
            return response.json()
        except ValueError:
            return None

    def get(self, path, expected_status=httplib.OK):
        result = self._call(requests.get, path, expected_status=expected_status)
        logger.info('GET {}: {}'.format(path, result))
        return result

    def post(self, path, data, expected_status=httplib.CREATED):
        result = self._call(requests.post, path,
                            json=data,
                            expected_status=expected_status)
        logger.info('POST {!r} -> {}: {}'.format(repr(data), path, result))
        return result

    def put(self, path, data, expected_status=httplib.OK):
        result = self._call(requests.put, path,
                            json=data,
                            expected_status=expected_status)
        logger.info('PUT {!r} -> {}: {}'.format(repr(data), path, result))
        return result

    def delete(self, path, data=None, expected_status=httplib.NO_CONTENT):
        result = self._call(requests.delete, path, json=data, expected_status=expected_status)
        logger.info('DELETE {}'.format(path))
        return result

class Warehaus(object):
    ADMIN = dict(username='admin', password='admin')
    USER  = dict(username='user' , password='user')

    def __init__(self):
        super(Warehaus, self).__init__()
        self._docker = docker.Client(base_url='unix://var/run/docker.sock', version='auto')
        self._container = None
        self.api = None

    def start(self):
        command = ''
        volumes = ['/var/log/warehaus']
        host_config = {
            'port_bindings': {
                80: 80,
            },
            'links': {
                'rethinkdb': 'rethinkdb',
            },
            'binds': {
                os.environ['TEST_LOGS']: {
                    'bind': '/var/log/warehaus',
                    'mode': 'rw',
                },
            },
        }
        if os.environ.get('TEST_MODE', 'production') == 'source':
            command = 'warehaus --dev'
            volumes.append('/opt/warehaus')
            host_config['binds'][os.environ['SRC_DIR']] = {
                'bind': '/opt/warehaus',
                'mode': 'rw',
            }
        self._container = self._docker.create_container(
            command = command,
            image = os.environ['TEST_IMAGE'],
            volumes = volumes,
            host_config = self._docker.create_host_config(**host_config),
        )
        if self._container['Warnings']:
            raise RuntimeError('Could not create container: {!r}'.format(self._container))
        self._docker.start(container=self._container['Id'])
        inspection = self._docker.inspect_container(self._container['Id'])
        self.base_uri = 'http://{}'.format(inspection['NetworkSettings']['IPAddress'])
        self.api = RestfulAPI(self.base_uri)

    def wait(self, timeout=120):
        error = None
        start_time = time.time()
        while (start_time + timeout) > time.time():
            try:
                response = requests.get(self.base_uri + '/api/auth/self')
                if response.status_code in (httplib.OK, httplib.UNAUTHORIZED):
                    return
            except requests.exceptions.RequestException as error:
                logger.debug(error)
            time.sleep(0.1)
        raise error

    def stop(self):
        self._docker.stop(container=self._container['Id'])
        self._docker.remove_container(container=self._container['Id'], v=True)
        self.api = None

    def login(self):
        self.api.current_user.push('login', self.ADMIN)

    def ensure_user(self):
        users = self.api.get('/api/auth/users')['objects']
        if not any(user['username'] == self.USER['username'] for user in users):
            new_user = self.api.post('/api/auth/users', dict(
                username=self.USER['username'], display_name=self.USER['username'], role='user'))
            self.api.put('/api/auth/users/{}'.format(new_user['id']), dict(password=dict(new_password=self.USER['password'])))
            self.api.post('/api/auth/login/local', self.USER, expected_status=httplib.OK)

    def get_labs(self):
        return self.api.get('/api/v1/labs')['labs']

    def create_lab(self, slug):
        return self.api.post('/api/v1/labs', dict(slug=slug, display_name=slug.title()))

    def delete_lab(self, lab_slug, expected_status=httplib.NO_CONTENT):
        return self.api.delete('/api/v1/labs/{}/'.format(lab_slug), expected_status=expected_status)

    def create_type_object(self, lab, type_key, slug, name_singular, name_plural, **kwargs):
        self.api.post('/api/v1/labs/{}/type-objects'.format(lab['slug']), dict(
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
        assert len(before_lab_creation) + 1 == len(after_lab_creation)
        assert any(lab['slug'] == lab_slug for lab in after_lab_creation), after_lab_creation
        yield lab
        self.delete_lab(lab_slug)
        after_lab_deletion = self.get_labs()
        assert len(before_lab_creation) == len(after_lab_deletion)
        assert all(lab['slug'] != lab_slug for lab in after_lab_deletion), after_lab_deletion

@pytest.fixture(scope='session')
def warehaus(request):
    wh = Warehaus()
    wh.start()
    request.addfinalizer(wh.stop)
    wh.wait()
    wh.login()
    wh.ensure_user()
    return wh
