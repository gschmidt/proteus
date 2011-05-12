import errno
import hashlib
import os
import signal
import subprocess
import time

# TODO replace with subprocess.check_output, which I think does exactly this?
def check_call_get_output(args):
    """Args is a list: [program, arg1, arg2]... Run the indicated program
    and return whatever it wrote to stdout. Raise an exception if it
    fails (defined as returning nonzero.)"""
    obj = subprocess.Popen(args, stdout=subprocess.PIPE)
    (stdout, stderr) = obj.communicate()
    if 0 != obj.returncode:
        raise Exception("Failed: " + ' '.join(args))
    return stdout

PLATFORM = None

def platform():
    """What platform are we on? Valid values: 'darwin', 'linux'"""
    global PLATFORM
    if None == PLATFORM:
        _determine_platform()
    assert None != PLATFORM
    return PLATFORM

def _determine_platform():
    """Set the global PLATFORM according to what platform we're on"""
    global PLATFORM

    uname = check_call_get_output(['uname']).rstrip()
    if "Darwin" == uname:
        PLATFORM = "darwin"
        return
    if "Linux" == uname:
        PLATFORM = "linux"
        return
    raise Exception("Unknown platform: " + uname)

# The root of the project tree
PROJECT_ROOT = None

def project_root():
    """Return the root of the project tree"""
    global PROJECT_ROOT
    if None == PROJECT_ROOT:
        root = _find_project_root_marker(os.getcwd())
        root2 = _find_project_root_marker(os.path.dirname(__file__))
        if None == root or None == root2 or \
                os.path.realpath(root) != os.path.realpath(root2):
            raise Exception("This program must be run from within a "
                            "copy of the project tree")
        PROJECT_ROOT = root
    return PROJECT_ROOT

def _find_project_root_marker(start):
    """Search upwards from the directory 'start' until we find a
    directory that contains a file called PROJECT_ROOT. Return that
    directory, or None if we fail to find anything."""

    orig_cwd = os.getcwd()
    os.chdir(start)
    try:
        while True:
            try:
                os.stat('PROJECT_ROOT')
                return os.getcwd();
            except OSError:
                pass
            old = os.getcwd()
            os.chdir('..')
            if old == os.getcwd():
                return None
    finally:
        os.chdir(orig_cwd)

def path_in_project(*args):
    return os.path.join(*([project_root()] + list(args)))

def cd_in_project(path):
    os.chdir(path_in_project(path))

def ensure_directory(path):
    """If the directory 'path' does not exist, create it, creating
    parent directories if necessary."""
    if not os.path.isdir(path):
        os.makedirs(path)

def _check_pidfile(pidfile):
    """Look at pidfile (if it exists), send kill -0, and make our best
    guess as to what's going on: return None if we don't think the
    daemon's running, or the pid if we think it is. As as side effect,
    if the pidfile exists and we think it's stale, delete it."""

    try:
        f = open(pidfile, 'r')
    except IOError: # probably doesn't exist.. close enough
        return None

    pid = int(f.read())
    f.close()

    # see if that process still exists (by 'sending' it signal 0,
    # which tells kill to not actually send a signal, just do error
    # checking) .. this isn't perfect (maybe we're really unlucky and
    # some other process is running under that pid that isn't us) but
    # it's a start, and pretty standard
    try:
        os.kill(pid, 0)
    except OSError, e:
        if (e.errno == errno.ESRCH): # no such process.. stale pidfile
            os.remove(pidfile)
            return None
        raise e

    # I'm satisfied
    return pid

def check_daemon(pidfile):
    """Given the pidfile where a daemon would store its pid, if it
    were running, return None if we do not believe the daemon is
    running, or its pid if we believe that it is."""
    return _check_pidfile(pidfile)

# TODO: run as nobody [more generally, have some kind of plan for process
#  ownership.. we can't go kill -0'ing totally random processes]
# TODO: rotate logs (possibly by moving that logic into node.js? or piping
#   the output to a logger process?)
# TODO: arrange to remove pidfile automatically if daemon crashes
def run_daemon(pidfile, command, stdout_log, stderr_log):
    """Daemonize, then run the process indicated by command (a
    subprocess.call-style argument vector). Save the pid of the daemon
    to pidfile. (If pidfile already exists, raise an exception and do
    nothing.) Redirect stdout and stderr to the named files, which
    will be opened in append mode."""

    if None != _check_pidfile(pidfile):
        raise Exception("Daemon appears to already be running. Stop first.")

    # Reference: http://code.activestate.com/recipes/278731/

    # First fork
    pid = os.fork()
    if (pid != 0):
        return # parent returns and carries on with the script

    # Fork a second time, so that there will be no zombie issues and
    # to ensure that we are entirely dissociated from the terminal
    os.setsid()
    pid = os.fork()
    if (pid != 0):
        os._exit(0)

    os.chdir('/')
    os.umask(0)

    import resource
    maxfd = resource.getrlimit(resource.RLIMIT_NOFILE)[1]
    if (maxfd == resource.RLIM_INFINITY):
        maxfd = 1024 # whatever
    for fd in range (0, maxfd):
        try:
            os.close(fd)
        except OSError:
            pass

    os.open("/dev/null", os.O_RDONLY) # stdin
    os.open(stdout_log, os.O_WRONLY|os.O_CREAT|os.O_APPEND) # stdout
    os.open(stderr_log, os.O_WRONLY|os.O_CREAT|os.O_APPEND) # stderr

    # TODO: clean environment?

    f = open(pidfile, 'w')
    f.write(str(os.getpid()))
    f.close()

    os.execv(command[0], command)

def stop_daemon(pidfile):
    """Stop daemon whose pid is contained in the file pidfile. If pidfile
    doesn't exist, or the pid in it doesn't match a running process, do
    nothing."""

    pid = _check_pidfile(pidfile)
    if None == pid:
        # Daemon doesn't apprea to be running. Great?
        return

    # ask nicely
    os.kill(pid, signal.SIGTERM)
    os.remove(pidfile)

    # wait ~3 seconds, checking every 50ms
    for x in range(0,3*20):
        time.sleep(.05)
        try:
            os.kill(pid, 0)
        except OSError, e:
            if (e.errno == errno.ESRCH):
                 # no such process => success
                return

    # sudo make me a sandwich
    os.kill(pid, signal.SIGKILL)

def makeRandomString():
    m = hashlib.md5()
    m.update(str(os.getpid()))
    m.update(str(time.time())) # has a fractional part
    m.update(str(os.getcwd())) # includes username, or something
    return m.hexdigest()
