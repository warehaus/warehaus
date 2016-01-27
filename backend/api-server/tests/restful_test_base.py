import os
import time
import socket
import httplib
import unittest
import requests
from logging import getLogger
from urlparse import urljoin
from multiprocessing import Process
from contextlib import closing

logger = getLogger(__name__)

class RestfulTestBase(unittest.TestCase):
    @staticmethod
    def _free_port():
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            sock.bind(('127.0.0.1', 0))
            return sock.getsockname()[1]

    @staticmethod
    def _wait_for_socket(port):
        for i in range(10):
            with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
                try:
                    sock.connect(('127.0.0.1', port))
                except socket.error:
                    pass
                else:
                    return
            time.sleep(0.1)
        raise RuntimeError('Timed out waiting for server')

    def create_app(self):
        raise NotImplementedError()

    def setUp(self):
        self._test_server_url = os.environ.get('TEST_SERVER_URL', None)
        self._app_proc = None
        if not self._test_server_url:
            port = self._free_port()
            self._app = self.create_app()
            self._app_proc = Process(target=self._app.run, kwargs=dict(host='127.0.0.1', port=port))
            self._app_proc.start()
            self._wait_for_socket(port)
            self._test_server_url = 'http://127.0.0.1:{}'.format(port)

    def tearDown(self):
        if self._app_proc is not None:
            self._app_proc.terminate()
            self._app_proc.join()
            self._app_proc = None

    def app_url(self, path=None):
        if path is None:
            return self._test_server_url
        return urljoin(self._test_server_url, path)

    def _call(self, method, path, expected_status=httplib.OK, *args, **kwargs):
        url = self.app_url(path)
        response = method(url, *args, **kwargs)
        self.assertEqual(response.status_code, expected_status, 'URL: {}, EXPECTED: {}, GOT: {}, DATA: {}'.format(
            url, expected_status, response.status_code, response.text))
        return None if response.status_code == httplib.NO_CONTENT else response.json()

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

    def delete(self, path, expected_status=httplib.NO_CONTENT):
        result = self._call(requests.delete, path, expected_status=expected_status)
        logger.info('DELETE {}'.format(path))
        return result

class AuthorizedRestfulTestBase(RestfulTestBase):
    LOGIN_PATH = '/api/v1/auth/login'
    ADMIN_CREDENTIALS = dict(username='admin', password='admin')
    USER_CREDENTIALS = dict(username='user', password='user')

    def __init__(self, *args, **kwargs):
        super(AuthorizedRestfulTestBase, self).__init__(*args, **kwargs)
        self._jwt_token = None

    def setUp(self):
        super(AuthorizedRestfulTestBase, self).setUp()
        if self._jwt_token is None:
            # Login with both ADMIN_CREDENTIALS and USER_CREDENTIALS to ensure
            # both of those users exist.
            self.post(self.LOGIN_PATH, self.USER_CREDENTIALS, expected_status=httplib.OK)
            login_res = self.post(self.LOGIN_PATH, self.ADMIN_CREDENTIALS, expected_status=httplib.OK)
            self._jwt_token = login_res['access_token']

    def auth_headers(self):
        return {'Authorization': 'JWT {}'.format(self._jwt_token)}

    def _call(self, *args, **kwargs):
        headers = kwargs.pop('headers', {})
        if self._jwt_token:
            headers.update(self.auth_headers())
        return super(AuthorizedRestfulTestBase, self)._call(headers=headers, *args, **kwargs)
