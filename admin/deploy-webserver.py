#!/usr/bin/python

# When it's time to deploy to a webserver, this script is scp'd to a
# temporary location (under a temporary name), and then run. So, it
# can't count on any of the rest of the repo being present.

# TODO: Nuke this from orbit and make better; it's a quick hack
# TODO: Report errors to someone who can deal with them!!

import os
from subprocess import call, check_call

os.chdir(os.path.join(os.getenv('HOME'), 'blasphemy'))
try:
    call(['admin/run-prod.py', 'stop'])
except OSError:
    # mayde admin/run-prod.py doesn't exist yet, or something.. whatever
    pass
check_call(["git", "pull", "origin", "master"])
check_call(['admin/build.py'])
call(['admin/run-prod.py', 'stop'])
check_call(['admin/run-prod.py', 'start'])

print """-------------------------------------------------------------------------------
deployed successfully.. perhaps ...
-------------------------------------------------------------------------------"""
