#! /usr/bin/env python

# This is a simple http server that handles partial content.  The default
# packaged python http server does not.  Browsers need this for scrubbing.
#
# Python2

# Original Source: https://gist.github.com/pankajp/280596a5dabaeeceaaaa

from __future__ import print_function

# Standard library imports.
import argparse
import sys
import json
import os
from os.path import (join, exists, dirname, abspath, isabs, sep, splitext,
    isdir, basename, expanduser, split, splitdrive)
from os import makedirs, unlink, getcwd, chdir, curdir, pardir, rename, fstat
from shutil import copyfileobj, copytree
import glob
from zipfile import ZipFile
from posixpath import normpath
import re
import cgi
import threading
import socket
import errno
import time
try:
    # Python 3
    from http.server import HTTPServer, SimpleHTTPRequestHandler
    from io import StringIO
    from socketserver import ThreadingMixIn
    from urllib.parse import urlparse, parse_qs
    from urllib.request import urlopen, quote, unquote
except ImportError:
    # Python 2
    from BaseHTTPServer import HTTPServer
    from cStringIO import StringIO
    from SimpleHTTPServer import SimpleHTTPRequestHandler
    from SocketServer import ThreadingMixIn
    from urllib import urlopen, quote, unquote
    from urlparse import urlparse, parse_qs

DATA_DIR = getcwd() # join(expanduser('~'), APP_NAME)

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    pass


class RequestHandler(SimpleHTTPRequestHandler):
    """ Handler to handle POST requests for actions.
    """

    serve_path = DATA_DIR
    video_path = None
    video_labels_path = None
    default_delay = 0
    delays = {}

    def do_GET(self):
        """ Overridden to handle HTTP Range requests. """
        self.range_from, self.range_to = self._get_range_header()
        if self.range_from is None:
            # nothing to do here
            return SimpleHTTPRequestHandler.do_GET(self)
        print('range request', self.range_from, self.range_to)
        f = self.send_range_head()
        if f:
            self.copy_file_range(f, self.wfile)
            f.close()

    def copyfile(self, source, outputfile):
        """ Overridden to handle encoding issues in Python 3. """
        print('copyfile')
        while True:
            buf = source.read(16 * 1024)
            if not buf:
                break
            if sys.version_info[0] >= 3 and not isinstance(buf, bytes):
                buf = buf.encode()
            outputfile.write(buf)

    def copy_file_range(self, in_file, out_file):
        """ Copy only the range in self.range_from/to. """
        in_file.seek(self.range_from)
        # Add 1 because the range is inclusive
        bytes_to_copy = 1 + self.range_to - self.range_from
        buf_length = 64*1024
        bytes_copied = 0
        while bytes_copied < bytes_to_copy:
            read_buf = in_file.read(min(buf_length, bytes_to_copy-bytes_copied))
            if len(read_buf) == 0:
                break
            out_file.write(read_buf)
            bytes_copied += len(read_buf)
        return bytes_copied

    def send_range_head(self):
        """Common code for GET and HEAD commands.

        This sends the response code and MIME headers.

        Return value is either a file object (which has to be copied
        to the outputfile by the caller unless the command was HEAD,
        and must be closed by the caller under all circumstances), or
        None, in which case the caller has nothing further to do.

        """
        path = self.translate_path(self.path)
        f = None
        if isdir(path):
            if not self.path.endswith('/'):
                # redirect browser - doing basically what apache does
                self.send_response(301)
                self.send_header("Location", self.path + "/")
                self.end_headers()
                return None
            for index in "index.html", "index.htm":
                index = join(path, index)
                if exists(index):
                    path = index
                    break
            else:
                return self.list_directory(path)

        if not exists(path) and path.endswith('/data'):
            # FIXME: Handle grits-like query with /data appended to path
            # stupid grits
            if exists(path[:-5]):
                path = path[:-5]

        ctype = self.guess_type(path)
        try:
            # Always read in binary mode. Opening files in text mode may cause
            # newline translations, making the actual size of the content
            # transmitted *less* than the content-length!
            f = open(path, 'rb')
        except IOError:
            self.send_error(404, "File not found")
            return None

        if self.range_from is None:
            self.send_response(200)
        else:
            self.send_response(206)

        self.send_header("Content-type", ctype)
        fs = fstat(f.fileno())
        file_size = fs.st_size
        if self.range_from is not None:
            if self.range_to is None or self.range_to >= file_size:
                self.range_to = file_size-1
            self.send_header("Content-Range",
                             "bytes %d-%d/%d" % (self.range_from,
                                                 self.range_to,
                                                 file_size))
            # Add 1 because ranges are inclusive
            self.send_header("Content-Length",
                             (1 + self.range_to - self.range_from))
        else:
            self.send_header("Content-Length", str(file_size))
        self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
        self.end_headers()
        return f

    def list_directory(self, path):
        """Helper to produce a directory listing (absent index.html).

        Return value is either a file object, or None (indicating an
        error).  In either case, the headers are sent, making the
        interface the same as for send_head().

        """
        try:
            list = os.listdir(path)
        except os.error:
            self.send_error(404, "No permission to list directory")
            return None
        list.sort(key=lambda a: a.lower())
        f = StringIO()
        displaypath = cgi.escape(unquote(self.path))
        f.write('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">')
        f.write("<html>\n<title>Directory listing for %s</title>\n" % displaypath)
        f.write("<body>\n<h2>Directory listing for %s</h2>\n" % displaypath)
        f.write("<hr>\n<ul>\n")
        for name in list:
            fullname = os.path.join(path, name)
            displayname = linkname = name
            # Append / for directories or @ for symbolic links
            if os.path.isdir(fullname):
                displayname = name + "/"
                linkname = name + "/"
            if os.path.islink(fullname):
                displayname = name + "@"
                # Note: a link to a directory displays with @ and links with /
            f.write('<li><a href="%s">%s</a>\n'
                    % (quote(linkname), cgi.escape(displayname)))
        f.write("</ul>\n<hr>\n</body>\n</html>\n")
        length = f.tell()
        f.seek(0)
        self.send_response(200)
        encoding = sys.getfilesystemencoding()
        self.send_header("Content-type", "text/html; charset=%s" % encoding)
        self.send_header("Content-Length", str(length))
        self.end_headers()
        return f

    def translate_path(self, path):
        """ Override to handle redirects.
        """
        path = path.split('?',1)[0]
        path = path.split('#',1)[0]
        path = normpath(unquote(path))
        words = path.split('/')
        words = list(filter(None, words))
        filename = words[-1] if words else ""
        time.sleep(self.delays.get(filename, self.default_delay))
        if filename == "video.mp4":
            return self.video_path
        elif filename == "video-labels.json":
            return self.video_labels_path
        path = self.serve_path
        for word in words:
            drive, word = splitdrive(word)
            head, word = split(word)
            if word in (curdir, pardir): continue
            path = join(path, word)
        return path

    # Private interface ######################################################

    def _get_range_header(self):
        """ Returns request Range start and end if specified.
        If Range header is not specified returns (None, None)
        """
        range_header = self.headers.get("Range")
        if range_header is None:
            return (None, None)
        if not range_header.startswith("bytes="):
            print("Not implemented: parsing header Range:", range_header)
            return (None, None)
        regex = re.compile(r"^bytes=(\d+)\-(\d+)?")
        rangething = regex.search(range_header)
        if rangething:
            from_val = int(rangething.group(1))
            if rangething.group(2) is not None:
                return (from_val, int(rangething.group(2)))
            else:
                return (from_val, None)
        else:
            print('CANNOT PARSE RANGE HEADER:', range_header)
            return (None, None)


def main(args=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("-p", "--port", type=int, default=8000)
    parser.add_argument("-s", "--serve-path", default=DATA_DIR,
        help="Path to serve static files from")
    parser.add_argument("-v", "--video-path", "--video",
        default=os.path.join(DATA_DIR, "test", "data", "video.mp4"),
        help="Path to test video")
    parser.add_argument("-f", "--video-fps", "--fps", type=float, default=None,
        help="Framerate of video (default: auto-detected based on labels)")
    parser.add_argument("-l", "--video-labels-path", "--video-labels",
        default=os.path.join(DATA_DIR, "test", "data", "video-labels.json"),
        help="Path to test labels")
    delay_group = parser.add_argument_group("delays")
    delay_group.add_argument("-d", "--delay", type=float, default=0,
        help="Time to wait before serving any request")
    delay_group.add_argument("--video-delay", type=float, default=None,
        help="Time to wait before serving a video request")
    delay_group.add_argument("--video-labels-delay", type=float, default=None,
        help="Time to wait before serving a video labels request")
    args = parser.parse_args()

    RequestHandler.serve_path = args.serve_path
    RequestHandler.video_path = args.video_path
    RequestHandler.video_labels_path = args.video_labels_path
    RequestHandler.default_delay = args.delay
    if args.video_delay:
        RequestHandler.delays["video.mp4"] = args.video_delay
    if args.video_labels_delay:
        RequestHandler.delays["video-labels.json"] = args.video_labels_delay
    with open(os.path.join(DATA_DIR, "test", "data", "config.js"), "w") as f:
        f.write('CONFIG = {};')
        if args.video_fps is not None:
            f.write('CONFIG.video_fps = %f;' % args.video_fps)

    httpd = ThreadingHTTPServer(("", args.port), RequestHandler)

    print("serving at port", args.port)
    httpd.serve_forever()

if __name__ == "__main__" :
    main()
