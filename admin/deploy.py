#!/usr/bin/python

import os
import sys
from subprocess import check_call

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from admintools import *

def main():
    where = 'deploy@crysknife.projectmonument.org'
    remote_name = "/tmp/deploy." + makeRandomString() + ".py"

    print "Deploying to %s..." % (where,)
    check_call(['scp',
                os.path.join(project_root(), 'admin', 'deploy-webserver.py'),
                where + ':' + remote_name])
    check_call(['ssh', where, remote_name])
    # TODO: possibly, should return immediately? i don't know..
    print "Deployed! hopefully."

if __name__ == "__main__":
  sys.exit(main())
