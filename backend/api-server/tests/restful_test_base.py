import os
import time
import socket
import httplib
import unittest
import requests
from logging import getLogger
from urlparse import urljoin
from subprocess import Popen
from multiprocessing import Process
from contextlib import closing
from commands import getstatusoutput

logger = getLogger(__name__)

class APIServer(object):
    def __init__(self, url):
        super(APIServer, self).__init__()
        self._url = url
        self._jwt_token = None

    def app_url(self, path=None):
        if path is None:
            return self._url
        return urljoin(self._url, path)

    def jwt_token(self, jwt_token):
        self._jwt_token = jwt_token

    def auth_headers(self):
        return {'Authorization': 'JWT {}'.format(self._jwt_token)}

    def _call(self, method, path, expected_status=httplib.OK, *args, **kwargs):
        headers = kwargs.pop('headers', {})
        if self._jwt_token:
            headers.update(self.auth_headers())
        url = self.app_url(path)
        response = method(url, headers=headers, *args, **kwargs)
        assert response.status_code == expected_status, 'URL: {}, EXPECTED: {}, GOT: {}, DATA: {}'.format(
            url, expected_status, response.status_code, response.text)
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

class RestfulTestBase(unittest.TestCase):
    @staticmethod
    def _free_port():
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            sock.bind(('127.0.0.1', 0))
            return sock.getsockname()[1]

    @staticmethod
    def _wait_for_socket(port, name):
        for i in range(100):
            with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
                try:
                    sock.connect(('127.0.0.1', port))
                except socket.error:
                    pass
                else:
                    return
            time.sleep(0.1)
        raise RuntimeError('Timed out waiting for server at {} ({})'.format(port, name))

    def create_app(self):
        raise NotImplementedError()

    def _init_db(self):
        status, output = getstatusoutput('/usr/local/bin/warehaus-init-db')
        if status != 0:
            raise RuntimeError(output)

    def _init_auth_server(self):
        self._auth_server_proc = None
        self._auth_port = self._free_port()
        env = dict(os.environ)
        env['HTTP_PORT'] = str(self._auth_port)
        self._auth_server_proc = Popen(['/usr/local/bin/warehaus-auth-server'], env=env, shell=False)
        self._wait_for_socket(self._auth_port, 'auth')
        self._auth_server_url = 'http://127.0.0.1:{}'.format(self._auth_port)
        self.auth_server = APIServer(self._auth_server_url)

    def _teardown_auth_server(self):
        if self._auth_server_proc is not None:
            self._auth_server_proc.terminate()
            self._auth_server_proc.wait()
            self._auth_server_proc = None

    def _init_api_server(self):
        self._test_server_url = os.environ.get('TEST_SERVER_URL', None)
        self._app_proc = None
        if not self._test_server_url:
            port = self._free_port()
            self._app = self.create_app()
            self._app_proc = Process(target=self._app.run, kwargs=dict(host='127.0.0.1', port=port))
            self._app_proc.start()
            self._wait_for_socket(port, 'app')
            self._test_server_url = 'http://127.0.0.1:{}'.format(port)
        self.api_server = APIServer(self._test_server_url)

    def _teardown_api_server(self):
        if self._app_proc is not None:
            self._app_proc.terminate()
            self._app_proc.join()
            self._app_proc = None

    def setUp(self):
        self._init_db()
        self.addCleanup(self._teardown_api_server)
        self._init_api_server()
        self.addCleanup(self._teardown_auth_server)
        self._init_auth_server()
