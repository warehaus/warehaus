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
        'setuptools',
        'Flask == 0.10.1',
    ],

    entry_points = {
        'console_scripts': [
            'labsome-server=labsome.backend.server:main',
        ],
    },
)
