#!/usr/bin/python
import os
from setuptools import setup
from setuptools import find_packages

here = os.path.dirname(__file__)

setup(
    name = 'labsome',
    version = open(os.path.join(here, '..', 'VERSION')).read().strip(),
    url = 'http://www.labsome.io/',
    license = 'AGPL-3.0',
    zip_safe = False,

    packages = find_packages(),
    include_package_data = True,

    install_requires = [
        'Flask == 0.10.1',
        'Flask-Login == 0.2.11',
        'Flask-Mail == 0.9.1',
        'Flask-Principal == 0.4.0',
        'Flask-Security == 1.7.4',
        'Flask-SQLAlchemy == 2.1',
        'Flask-WTF == 0.12',
        'SQLAlchemy == 1.0.9',
        'bunch == 1.0.1',
        'flask-restless == 0.17.0',
        'psycopg2',
        'setuptools',
        'sqlalchemy_utils == 0.31.3',
    ],

    extras_require = {
        'docs': [
            'mkdocs',
        ],
    },

    entry_points = {
        'console_scripts': [
            'labsome-server=labsome.backend.server:main',
        ],
    },
)
