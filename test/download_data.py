#!/usr/bin/env python
'''
Downloads example data from Google Drive.

Usage:
    python download_data.py

Copyright 2017-2020, Voxel51, LLC
voxel51.com

Brian Moore, brian@voxel51.com
'''
# pragma pylint: disable=redefined-builtin
# pragma pylint: disable=unused-wildcard-import
# pragma pylint: disable=wildcard-import
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals
from builtins import *
# pragma pylint: enable=redefined-builtin
# pragma pylint: enable=unused-wildcard-import
# pragma pylint: enable=wildcard-import

import logging
import os

import eta.core.web as etaw
import eta.core.utils as etau


logger = logging.getLogger(__name__)


FILE_ID = "1MZAKNHNFYVhqP47MkUAvLApY5GKYpKuR"

os.chdir(os.path.dirname(os.path.abspath(__file__)))
logger.info("Downloading example data from Google Drive")
path = "data.zip"
etaw.download_google_drive_file(FILE_ID, path=path)
etau.extract_zip(path, delete_zip=True)
