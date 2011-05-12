#!/usr/bin/python

import os
import sys
from subprocess import check_call

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from admintools import *

def main():
    ensure_directory(path_in_project('build'))

    print "*** Building node.js ***"
    cd_in_project('3rdparty/node')
    check_call(['./configure', '--prefix',
                os.path.join(project_root(), 'build', 'node')])
    check_call(['make'])
    check_call(['make', 'install'])

    print
    print '/                                 \\'
    print '| JACK ME INTO THE MATRIX CAPTAIN |'
    print '| JACK ME INTO THE MATRIX CAPTAIN |'
    print '| JACK ME INTO THE MATRIX CAPTAIN |'
    print '\\                                 /'

if __name__ == "__main__":
  sys.exit(main())
