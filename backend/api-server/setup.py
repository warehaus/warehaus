#!/usr/bin/python
import os
from setuptools import setup
from setuptools import find_packages

setup(
    name = 'warehaus_api',
    version = '0.1.0',
    url = 'http://warehaus.io/',
    license = 'AGPL-3.0',
    zip_safe = True,

    packages = find_packages(),
    include_package_data = True,
    package_data = {
        '': ['*.txt'],
    },

    install_requires = [
        'Flask == 0.10.1',
        'Flask-JWT == 0.3.2',
        'Flask-RethinkDB == 0.2',
        'flask-restful == 0.3.5',
        'python-slugify == 1.1.4',
        'blinker == 1.4',
        'bunch == 1.0.1',
        'gevent',
        'gunicorn',
        'pytz',
        'rethinkdb',
        'setuptools',
    ],

    test_suite = 'tests.suite',
    tests_require = [
        'requests',
    ],

    entry_points = {
        'console_scripts': [
            'warehaus-api-server=warehaus_api.api_server:main',
        ],
    },
)
