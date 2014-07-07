#!/usr/bin/env python

import os
from setuptools import setup

def read(fname):
    return open(os.path.join(os.path.dirname(__file__), fname)).read()

setup(name='webmonitor',
    version='0.0.1',
    description='Physics-orientated job monitoring over HTTP with Flask.',
    author='Alex Pearce',
    author_email='alex@alexpearce.me',
    url='https://github.com/alexpearce/root-web-monitoring',
    license=read('LICENSE'),
    long_description=read('README.md'),
    packages=['webmonitor'],
    install_requires=[
        'Flask>=0.10.1',
        'rq>=0.3.13',
        'redis>=2.9.1'
    ],
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Programming Language :: Python :: 2',
        'Environment :: Web Environment',
        'Framework :: Flask',
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: MIT License'
    ]
)