#!/usr/bin/python

# TODO: monitor for crashes and restart (consider monit)
# TODO: obviously will need a lot of expanding for multiple services, machines..
# TODO: possibly add nginx for static content
# TODO: tighten up server security (run as a dedicated push account..)

import os
import sys
from subprocess import call

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from admintools import *

def do_start():
    ensure_directory(path_in_project('run/pid'))
    ensure_directory(path_in_project('run/log'))
    ensure_directory(path_in_project('data/mongo'))

    if platform() not in ['darwin']:
        print "This script only knows where to find Mongo on Darwin. Fix it!"
        print "Platform: " + platform()
        return 0

    # If you change this, also change run-devel.py
    # TODO: there is a race where node starts before mongo is ready
    run_daemon(
        path_in_project('run/pid/mongo.pid'),
        [path_in_project('3rdparty/mongodb-osx/bin/mongod'),
         '--dbpath',
         # TODO: figure out where we're putting data..
         path_in_project('data/mongo')],
        path_in_project('run/log/mongo.stdout'),
        path_in_project('run/log/mongo.stderr'))
    run_daemon(
        path_in_project('run/pid/node.pid'),
        [path_in_project('build/node/bin/node'),
         path_in_project('framework/run_server.js')],
        path_in_project('run/log/node.stdout'),
        path_in_project('run/log/node.stderr'))

def do_stop():
    stop_daemon(path_in_project('run/pid/node.pid'))
    stop_daemon(path_in_project('run/pid/mongo.pid'))

def do_check():
    node_pid = check_daemon(path_in_project('run/pid/node.pid'))
    if None == node_pid:
        print "Node: Not running"
    else:
        print "Node: Running with pid %s" % (node_pid, )
    mongo_pid = check_daemon(path_in_project('run/pid/mongo.pid'))
    if None == mongo_pid:
        print "Mongo: Not running"
    else:
        print "Mongo: Running with pid %s" % (mongo_pid, )

def usage():
    sys.stderr.write("Usage: %s <start|stop|check>\n" %
                     (os.path.basename(sys.argv[0]), ))
    exit(1)

def main():
    if len(sys.argv) != 2:
        usage()

    command = sys.argv[1]
    if 'start' == command:
        do_start()
    elif 'stop' == command:
        do_stop()
    elif 'check' == command:
        do_check()
    else:
        usage()

    return 0

if __name__ == "__main__":
  sys.exit(main())


