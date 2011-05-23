#!/usr/bin/python

import os
import sys
import time
from subprocess import call

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from admintools import *

def main():
    os.chdir(project_root())
    ensure_directory(path_in_project('run/pid'))
    ensure_directory(path_in_project('run/log'))
    ensure_directory(path_in_project('data/mongo'))

    if platform() == 'darwin':
        mongod = path_in_project('3rdparty/mongodb-osx/bin/mongod')
    else:
        if platform() not in ['linux']:
            print "This script doesn't know where to find Mongo on this platform. Fix it!"
            print "Platform: " + platform()
            return 0
        mongod = "mongod"

    # If you change this, also change run-prod.py
    # TODO: generalize to support machines other than osx..
    stop_daemon(path_in_project('run/pid/mongo.pid'))
    print path_in_project('3rdparty/mongodb-osx/bin/mongod')
    run_daemon(
        path_in_project('run/pid/mongo.pid'),
        [mongod, '--dbpath',
         path_in_project('data/mongo')],
        path_in_project('run/log/mongo.stdout'),
        path_in_project('run/log/mongo.stderr'))

    while True:
        try:
            # If you change this, also change run-prod.py
            ret = subprocess.call(["build/node/bin/node",
                                   "framework/run_server.js",
                                   path_in_project('config/devel')])
        except KeyboardInterrupt:
            print "\n<Killed>"
            break
        # In debug mode, run_server.js returns 17 if it would like to
        # be reloaded (because code has changed on disk and it wants
        # to restart.)
        if ret == 17:
            continue
        if ret != 0:
            print "Server exited with error (return code %d)" % (ret, )
            break
        else:
            print "Server exited gracefully"
            break

    stop_daemon(path_in_project('run/pid/mongo.pid'))
    return 0

if __name__ == "__main__":
  sys.exit(main())
