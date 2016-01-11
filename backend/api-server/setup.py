#!/usr/bin/python
import os
from setuptools import setup
from setuptools import find_packages

here = os.path.dirname(__file__)

setup(
    name = 'labsome_api',
    version = open(os.path.join(here, '..', '..', 'VERSION')).read().strip(),
    url = 'http://www.labsome.com/',
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
        'Flask-SocketIO == 1.2',
        'python-slugify == 1.1.4',
        'bunch == 1.0.1',
        'eventlet == 0.17.4',
        'gunicorn == 19.4.1',
        'pytz',
        'rethinkdb >= 2.2.0',
        'setuptools',
    ],

    entry_points = {
        'console_scripts': [
            'labsome-init-db=labsome_api.init_db:main',
            'labsome-api-server=labsome_api.api_server:main',
        ],
    },
)
