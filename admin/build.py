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

    print "*** Building node-mongodb-native ***"
    # This is sloppy. node-mongodb-native can't be relocated, but it's
    # small, so we copy the whole package and then build it.
    check_call(['rm', '-rf', path_in_project('build/node-mongodb-native')])
    check_call(['cp', '-R', path_in_project('3rdparty/node-mongodb-native'),
                path_in_project('build')])
    cd_in_project('build/node-mongodb-native')
    saved_path = os.environ['PATH']
    os.environ['PATH'] = (os.environ['PATH'] + ":" + 
                          path_in_project('build/node/bin'))
    check_call(['make'])
    os.environ['PATH'] = saved_path

    print
    print '/                                 \\'
    print '| JACK ME INTO THE MATRIX CAPTAIN |'
    print '| JACK ME INTO THE MATRIX CAPTAIN |'
    print '| JACK ME INTO THE MATRIX CAPTAIN |'
    print '\\                                 /'

if __name__ == "__main__":
  sys.exit(main())
