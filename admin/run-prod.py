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

    # If you change this, also change run-devel.py
    run_daemon(
        path_in_project('run/pid/node.pid'),
        [path_in_project('build/node/bin/node'),
         path_in_project('framework/run_server.js')],
        path_in_project('run/log/node.stdout'),
        path_in_project('run/log/node.stderr'))

def do_stop():
    stop_daemon(path_in_project('run/pid/node.pid'))

def do_check():
    node_pid = check_daemon(path_in_project('run/pid/node.pid'))
    if None == node_pid:
        print "Node: Not running"
    else:
        print "Node: Running with pid %s" % (node_pid, )

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


