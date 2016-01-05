#!/usr/bin/python
import os
from setuptools import setup
from setuptools import find_packages

here = os.path.dirname(__file__)

setup(
    name = 'labsome',
    version = open(os.path.join(here, '..', 'VERSION')).read().strip(),
    url = 'http://www.labsome.com/',
    license = 'Commercial',
    zip_safe = True,

    packages = find_packages(),
    include_package_data = True,
    package_data = {
        '': ['*.txt'],
    },

    install_requires = [
        'Flask == 0.10.1',
        'Flask-Login == 0.3.2',
        'Flask-Principal == 0.4.0',
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
            'labsome-test-server=labsome.backend.test_server:main',
        ],
    },
)
