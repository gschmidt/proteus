#!/usr/bin/python

import os
import sys
from subprocess import call

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from admintools import *

def main():
    os.chdir(project_root())
    while True:
        try:
            # If you change this, also change run-prod.py
            ret = subprocess.call(["build/node/bin/node",
                                   "framework/run_server.js"])
        except KeyboardInterrupt:
            print "\n<Killed>"
            return 0
        # In debug mode, run_server.js returns 17 if it would like to
        # be reloaded (because code has changed on disk and it wants
        # to restart.)
        if ret == 17:
            continue
        if ret != 0:
            print "Server exited with error (return code %d)" % (ret, )
            return 0
        else:
            print "Server exited gracefully"
            return 0

if __name__ == "__main__":
  sys.exit(main())
