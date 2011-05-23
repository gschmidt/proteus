/**
 * Server bootstrap!
 *
 * Runs /server/main.js -- parsing out dependency lines and loading
 * dependencies as necessary.
 *
 * In debug/development mode: watches for any of the loaded files to
 * change, and if any of them changes, blows the whole process away
 * and reloads everything. When there is an error, sends reasonable
 * output to stdout and waits for the files to be changed to correct
 * the error.
 */

// TODO: document utf8 assumption?
// TODO: avoid realpath, to avoid confusing people that have lots of symlinks

(function () {
  var fs = require('fs');
  var Script = process.binding('evals').Script;

  // TODO: make configurable
  var is_debug_mode = true;

  /**** Find the root of the project ****/

  /// @return {String} absolute path to root of project; guaranteed to end
  ///   in '/'
  var findProjectRoot = function () {
    // assume that this script is in the 'framework' directory,
    // directly under the root directory
    var me = fs.realpathSync(process.argv[1]);
    if ('/' !== me[0])
      // TODO: Deal with relative paths (might happen on Solaris, perhaps?)
      // TODO: Deal with Windows??
      throw new Error("Can't find path to project root. See comments and fix me.");
    // this is a lame way to do it, but node doesn't provide the usual
    // complement of path handling functions
    // TODO: is it in 'path' and I missed it? duh
    var m = me.match(/^(.*\/)framework\/run_server.js$/);
    if (!m)
      throw new Error("Can't make sense of project layout.");
    return m[1];
  }

  var project_root = findProjectRoot();

  /**** Bootstrap: bring in libraries we need for the rest of the loader ****/

  // TODO: This strategy sucks, because these libraries will then get
  // loaded a second time when they are required (though, not a huge
  // deal since it'll be in a different v8 context.) Better to rewrite
  // the code in this file without dependencies.

  /// Load and eval 'path', which must be relative to
  /// project_root. Print a message and exit program on failure,
  /// including an exception in eval.
  var manuallyLoadOrDie = function (path) {
    path = project_root + path;

    try {
      var body = fs.readFileSync(path, 'utf8');
    } catch (e) {
      console.log(path + ": " + e.message);
      process.exit(1);
    }

    try {
      eval(body);
    } catch (e) {
      // TODO: alas, no file/line info.
      console.log('Error while loading ' + path + ' at startup:');
      console.log(e.stack);
      process.exit(1);
    }
  };

  manuallyLoadOrDie('/framework/lib/Class.js');

  /**** The loader: helpers ****/

  /// Make a (VM-wide) globally unique value that looks good in a
  /// debugger. Cf Lisp 'intern'
  /// @param name {String} human-readable string for debugging
  var makeSymbol = function (name) {
    return [ name ];
  };

  /// @return {String} The (binary) hash of the current contents of the
  /// file given by path, or the empty string if the file couldn't be
  /// read
  var fileHash = function (path) {
    var crypto = require('crypto');

    try {
      var contents_buf = fs.readFileSync(path); // do it in binary, not utf8
    } catch (e) {
      return '';
    }

    var hash = crypto.createHash('md5');
    hash.update(contents_buf);
    return hash.digest();
  };

  /// @return {String} If fullpath is an absolute path within
  ///   project_root, return a path relative to project_root. Else
  ///   return fullpath.
  var cutePath = function (fullpath) {
    if (fullpath.substr(0, project_root.length) === project_root)
      return fullpath.substr(project_root.length);
    else
      return fullpath;
  }

  /**** The loader: errors ****/

  var FileError = Class('FileError');
  FileError.constructor(function (_super, file) {
    _super();
    this.file = file; //< a File object
  });

  var FilesystemError = Class('FilesystemError', FileError);
  FilesystemError.constructor(function (_super, file, error) {
    _super(file);
    this.error = error; //< the Error (exception) that was thrown
  });
  FilesystemError.methods({
    toString: function () {
      return this.file._cutepath + ": " + this.error.message;
    }});

  var PreprocessorError = Class('PreprocessorError', FileError);
  PreprocessorError.constructor(function (_super, file, message) {
    _super(file);
    this.message = message; //< {String} human readable message
  });
  PreprocessorError.methods({
    toString: function () {
      return this.file._cutepath + ": " + this.message;
    }});

  var ParseFileError = Class('ParseFileError', FileError);
  // No line/column info for now, because we don't know how to get it
  ParseFileError.constructor(function (_super, file, message) {
    _super(file);
    this.message = message; //< {String} human readable message
  });
  ParseFileError.methods({
    toString: function () {
      return this.file._cutepath + ": " + this.message;
    }});

  var CircularDependencyError = Class('CircularDependencyError', FileError);
  /// @param cycle {List<File>} A dependency cycle starting and ending with file
  CircularDependencyError.constructor(function (_super, file, cycle) {
    var self = this;
    _super(file);
    /// {List<File>} a dependency cycle starting and ending with file
    self.cycle = [];
    cycle.forEach(function (f) {self.cycle.push(f);});
  });
  CircularDependencyError.methods({
    toString: function () {
      return "Circular dependency: " +
        this.cycle.map(function (x) {return x._cutepath;}).join(' => ');
    }});

  /**** The loader: the actual loader ****/

  var File = Class('File');

  File._STATE_NEW = makeSymbol('STATE_NEW');
  File._STATE_PREPROCESSED = makeSymbol('STATE_PREPROCESSED'); // deps parsed
  File._STATE_PARSED = makeSymbol('STATE_PARSED'); // JS parsed
  File._STATE_LOADED = makeSymbol('STATE_LOADED'); // actually run in context

  /// used to print pretty error messages when a circular dependency
  /// is detected
  File._dependency_stack = [];

  /// @param fullpath {String} full absolute path to file
  File.constructor(function (_super, fullpath) {
    var self = this;
    _super();

    self._fullpath = fullpath; ///< as passed to ctor
    self._cutepath = cutePath(fullpath); ///< short human readable path
    self._state = File._STATE_NEW;
    self._dependencies = []; ///< dependencies (File objects)
    self._dependents = []; ///: File objects that have this in _dependencies
    self._js = null; ///< contents of file, postprocessed, ready to parse as JS
    self._code = null; ///< contents of file, compiled to a Script
    self._errors = []; ///< any errors encountering while processing

    self._on_stack = false; ///< used to detect circular dependencies
    /// true if all dependencies have been prepped
    self._dependencies_loaded = false;

    /// true if file changed on disk since being preprocessed, *or* if that
    /// is true of one of the files that this file depends on..
    self._dirty = false;
    /// callbacks to make when _dirty becomes true
    self._dirty_listeners = [];
  });

  File.methods({
    /// @return {Boolean} True if this File is at least at the given state
    _isAtLeastAtState: function (target_state) {
      var self = this;

      var stateNum = function (s) {
        switch (s) {
        case File._STATE_NEW: return 0;
        case File._STATE_PREPROCESSED: return 1;
        case File._STATE_PARSED: return 2;
        case File._STATE_LOADED: return 3;
        default: throw new Error("Unknown state");
        }
      } ;

      return stateNum(self._state) >= stateNum(target_state);
    },

    /// Bring this file up to at least the given state. This should
    /// only be called through _ensureStateRecursively, in order to
    /// maintain the invariant that the state of a file is always less
    /// than or equal to the state of all of its dependents
    _ensureState: function (target_state) {
      var self = this;

      //console.log("_ensureState(" + target_state[0] + "): " + self._cutepath);
      while (!self._isAtLeastAtState(target_state)) {
        var orig_state = self._state;

        switch (self._state) {
        case File._STATE_NEW:
          self._preprocess();
          break;
        case File._STATE_PREPROCESSED:
          self._parse();
          break;
        case File._STATE_PARSED:
          self._load();
          break;
        default:
          throw new Error("Don't know how to advance from state");
        }

        if (orig_state === self._state)
          throw new Error(self._cutepath + " didn't advance from state " +
                      orig_state[0]);
      }
    },

    /// Bring this file and all of its transitive dependents up to at
    /// least the given state
    _ensureStateRecursively: function (target_state) {
      var self = this;

      if (self._on_stack) {
        // oops, circular dependency
        File._dependency_stack.push(self); // for the error
        self._errors.push(
          CircularDependencyError.create(self, File._dependency_stack));
        File._dependency_stack.pop();
        return;
      }

      // if we are already in at least this state, then our dependents
      // must be too, and we don't have to recurse
      if (self._isAtLeastAtState(target_state))
        return;

      File._dependency_stack.push(self);
      self._on_stack = true;
      try {
        // if we haven't run the preprocessor yet, do so, so we know our
        // dependencies. this temporarily breaks the invariant, but
        // we'll fix it in a second
        self._ensureState(File._STATE_PREPROCESSED);

        // bring all of our dependencies up to the target state
        self._dependencies.forEach(function (d) {
          d._ensureStateRecursively(target_state);
        });
      } finally {
        self._on_stack = false;
        var x = File._dependency_stack.pop();
        if (x !== self)
          throw new Error("_dependency_stack got messed up");
      }

      // bring ourselves up to the target state
      self._ensureState(target_state);
    },

    /// find and read file; set _dependencies
    _preprocess: function () {
      var self = this;

      if (File._STATE_NEW !== self._state)
        throw new Error("Bad state");

      // read file
      try {
        var body = fs.readFileSync(self._fullpath, 'utf8');
      } catch (e) {
        self._errors.push(FilesystemError.create(self, e));
        body = ''; // that will do for now
      }

      // parse out directives: lines that start with a # in the leftmost
      // column.
      var directives = body.match(/^#.*$/gm);
      directives && directives.forEach(function (d) {
        if ((parts = d.match(/^#\s*require\s*(.*)$/i))) {
          // TODO: very slightly lame that paths can't contain ' or "
          if ((inner_parts = parts[1].match(/^\('([^']*)'\)$/)) ||
              (inner_parts = parts[1].match(/^\("([^"]*)"\)$/))) {
            // add a dependent
            var depfile = File.findOrCreate(inner_parts[1]);
            if (depfile) {
              self._dependencies.push(depfile);
              depfile._dependents.push(self);
            } else {
              self._errors.push(
                PreprocessorError.create(self,
                                         "couldn't find requirement: '" +
                                         inner_parts[1]) + "'");
            }
          }
          else {
            self._errors.push(
              PreprocessorError.create(self,
                                       'syntax error in directive: ' + d));
          }
        }
        else {
          self._errors.push(
            PreprocessorError.create(self,
                                     'unrecognized directive: ' + d));
        }
      });

      // remove directives from source.. preserving line numbering
      self._js = body.replace(/^#.*$/gm,'');

      // now that we have set up _dependents, we can start watching
      // the file for changes. (we can't set it up earlier because
      // what if a callback happens? _markDirty needs the deps.) there
      // is a race where the file changes in between when it is read
      // and when we set up the watch, but I don't care.
      if (is_debug_mode) {
        var origHash = fileHash(self._fullpath);
        fs.watchFile(self._fullpath, {interval: 1}, function () {
          // confirm that the file actually changed.. a change of any
          // stat attribute (including last access time) is enough to
          // trip watchFile. rather than messing around with stat,
          // just look at the contents, so we're also robust to things
          // like 'git checkout' that change the mtime without
          // necessarily changing the file contents.
          if (origHash !== fileHash(self._fullpath))
            self._markDirty();
        });
      }

      self._state = File._STATE_PREPROCESSED;
    },

    // compile the code, but do not run it
    _parse: function () {
      var self = this;

      if (File._STATE_PREPROCESSED !== self._state)
        throw new Error("Bad state");

      if (self._errors.length > 0) {
        self._state = File._STATE_PARSED;
        return;
      }

      try {
        self._code = new Script(self._js, self._fullpath);
      } catch (e) {
        // If it's possible to get file and line information out of
        // Node, it's not easy. There are even comments in the Node
        // source about trouble getting SyntaxErrors to behave
        // properly. So at some (near?) point in the future, let's
        // just run lint here instead of parsing via Script.
        self._errors.
          push(ParseFileError.create(self, e.message));
      }

      self._state = File._STATE_PARSED;
    },

    _load: function () {
      var self = this;

      if (self._errors.length > 0)
        throw new Error("Can't load module; there were errors");

      // We may yet regret running the code in a new context. For
      // example, you want to connect via remote REPL and have the
      // context be your globals? Tough, can't set context on a
      // REPL in node.
      self._code.runInNewContext(app_context);
      self._state = File._STATE_LOADED;
    },

    _markDirty: function () {
      var self = this;
      if (self._dirty)
        return;
      self._dirty_listeners.forEach(function (c) { c(); });
      self._dirty = true;
      self._dependents.forEach(function (d) {
        d._markDirty();
      });
    },

    /// @return {List<FileError>} All _errors in self and all
    ///   dependents. If there are multiple CircularDependencyErrors,
    ///   include only one.
    _collectErrors: function () {
      var self = this;
      var errors = [];
      var anyCircular = false;
      var visited = [];

      var traverse = function (n) {
        // _on_stack is repurposed to mean 'visited'.. grody but works
        if (n._on_stack)
          return;
        visited.push(n);
        n._on_stack = true;
        n._errors.forEach(function (e) {
          if (e instanceof CircularDependencyError) {
            if (anyCircular)
              return;
            else
              anyCircular = true;
          }
          errors.push(e);
        });
        n._dependencies.forEach(traverse);
      };

      traverse(self);
      visited.forEach(function (n) {n._on_stack = false;});
      return errors;
    },

    /// TODO: docs
    /// TODO: in the future, will want a preflight function for client
    /// resources that optionally skips parsing (for deploy mode..)
    preflight: function () {
      var self = this;
      self._ensureStateRecursively(File._STATE_PARSED);
      return self._collectErrors();
    },

    /// TODO: docs
    /// TODO: what is contract? ie, what if you don't call preflight?
    load: function () {
      var self = this;
      self._ensureStateRecursively(File._STATE_LOADED);
    },

    /**
     * Return a Javascript bundle containing this file and all of its
     * dependencies, ready to be shipped to a remote machine and
     * executed there.
     *
     * Returns an object with keys:
     * - paths {List<String>} A list of paths, in the order they
     *   should be included in the document. Each will begin with
     *   path_prefix, followed by a slash.
     * - data {Object} Maps each string in paths to a string with the
     *   contents of the file.
     *
     * In deploy mode, this will return a single file, but in
     * development mode, we serve the bundle as multiple files to keep
     * things convenient.
     *
     * The filenames are guaranteed to change every time the data
     * changes (a hash is baked in), so you can instruct the remote
     * machine to cache them forever.
     *
     * Raises an error if preflight() would have returned a non-empty
     * errors list.
     *
     * TODO: in the future, will probably want to skip parsing, if
     * we're in deploy mode..
     *
     * @param path_prefix {String} Should not have a trailing slash
     * @return {Object}
     */
    getBundle: function (path_prefix) {
      var self = this;
      var crypto = require('crypto');
      self._ensureStateRecursively(File._STATE_PARSED);
      // factor out common code with _collectErrors?
      var visited = [];
      var any_errors = false;
      var ret = {paths: [], data: {}};

      var traverse = function (n) {
        if (n._on_stack)
          return; // already seen
        visited.push(n);
        n._on_stack = true;
        if (n._errors.length > 0) {
          any_errors = true;
          return;
        }
        n._dependencies.forEach(traverse);

        // get a hash, as a cachebuster for the filename. currently we
        // end up creating hashes twice in development mode -- but I
        // don't care
        var hash = crypto.createHash('md5');
        hash.update(n._js);
        var digest = hash.digest('base64');
        // put in URL-style base64 format, and strip ugly padding
        digest = digest.replace(/\+/g, '-').
          replace(/(\/)/g, '_').
          replace(/=/g, '');

        var path = path_prefix + "/" + n._cutepath + "?" + digest.substr(0, 6);
        ret.paths.push(path);
        ret.data[path] = n._js;
      }

      traverse(self);
      if (any_errors)
        throw new Error("Can't get bundle -- code has errors");
      visited.forEach(function (n) {n._on_stack = false;});

      // TODO: in prod mode, mash it all together into a single file
      return ret;
    },

    /// Register a function to call when this file (or any of its
    /// dependents) change on disk. That function will be called at
    /// most once (subsequent changes don't result in more calls.) If
    /// the file had already changed (since being loaded) when this
    /// function is called, then the callback function is called right
    /// away (the next time the event loop runs.)
    ///
    /// Only works in debug mode.
    ///
    /// There is no way to undo this (remove a callback) right now.
    onDirty: function (callback) {
      var self = this;

      if (!is_debug_mode)
        throw new Error("File.onDirty only supported in debug mode");

      if (self._dirty)
        process.nextTick(callback);
      else
        self._dirty_listeners.push(callback);
    }
  });

  /**
   * Given a module name, determine the corresponding file on disk. If
   * a File object already exists for that file, return it. Otherwise
   * create a new one. (Just creates the object -- does not load the
   * file.) If the file does not exist, return null.
   *
   * TODO: Currently just concatenates project_root onto the front of
   * pathspec. In the future, we might want to also try searching
   * relative to the file containing the #require, or have a search
   * path.
   *
   * @param pathspec {String} name of module, as specified in #require
   * @return {File} Singleton File objectn representing this module
   */
  File.findOrCreate = function (pathspec) {
    try {
      var path = fs.realpathSync(project_root + pathspec);
    } catch (e) {
      // must be because file doesn't exist. it'd be nice to register
      // watches on all of the places the file could have been, so
      // that we'll get reloaded when it is created, but that will
      // have to wait.
      return null;
    }

    if (File._all_files.hasOwnProperty(path)) {
      return File._all_files[path];
    }
    else {
      var f = File.create(path);
      if (File._all_files.hasOwnProperty(path)) {
        throw new Error('File loaded twice.. Uncaught circular dependency?');
      }
      File._all_files[path] = f;
      return f;
    }
  };
  File._all_files = {};

  /**** A little helper/hack, for getting automatic CSS reloading ****/

  var onPathDirty = function (fullpath, callback) {
    var origHash = fileHash(fullpath);
    fs.watchFile(fullpath, {interval: 1}, function () {
      if (origHash !== fileHash(fullpath))
        callback();
    });
  };

  /**** The context in which the app code will run ****/

  // the context (global object) for the actual application code
  var app_context = {
    require: require, // TODO: move someplace more controlled
    Buffer: Buffer, // TODO: move someplace more controlled
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    getFileObject: File.findOrCreate, // TODO: move someplace reasonable
    onPathDirty: onPathDirty, // TODO: eliminate weird hack
    project_root: project_root, // TODO: rename! for serious
    is_debug_mode: is_debug_mode, // ditto
    restart: function () {restart();}, // ditto ditto, plus it's ugly
    CONFIG: null, // this one is maybe reasonable? (it's populated by main())
    console: console // TODO: remove
  };

  /**** The main function ****/

  var restart = function () {
    console.log("========== Code changed ==========");

    // I don't know of any way to destroy the entire JS environment
    // and create a new one (to get rid of all of the old object
    // instances that might be hanging around with callbacks
    // registered.) So, we want to restart the Node process. It
    // would be nice if we could do this with execve but Node
    // doesn't bind it. So we just exit with a magic error code and
    // depend on a supervisor process to restart us.
    //
    // If we could do this (by extending/forking/replacing node) then
    // one advantage would be that we could recompile just the changed
    // files, which might matter in a very large project. Though, we
    // can still theoretically do that when it comes to checking for
    // parse errors.
    process.exit(17);
  };

  var main = function () {
    var my_args = process.argv.slice(2);

    // TODO: probably more friendly/unixy to take arguments on the
    // command line? we don't want to go the way of some systems that
    // have a giant XML config file lurking somewhere that is obnoxious
    // to manipulate..
    if (1 !== my_args.length) {
      console.log('Usage: ' + process.argv[0] + ' ' + process.argv[1] +
                  ' <path to environment config file>');
      process.exit(1);
    }

    var config_file = my_args[0];
    try {
      var config_unparsed = fs.readFileSync(config_file, 'utf8');
    } catch (e) {
      console.log(config_file + ": " + e.message);
      process.exit(1);
    }

    try {
      app_context.CONFIG = JSON.parse(config_unparsed);
    } catch (e) {
      console.log(config_unparsed);
      console.log(config_file + ": parse error: " + e.message);
      process.exit(1);
    }

    // in debug mode, if *this* file changes, restart the server
    if (is_debug_mode) {
      var myHash = fileHash(process.argv[1]);
      if ('' === myHash)
        throw new Error("Huh? I couldn't open myself?");

      fs.watchFile(process.argv[1], {interval: 1}, function () {
        if (myHash !== fileHash(process.argv[1]))
          restart();
      });
    }

    // TODO: catch any exceptions and print nicely..

    // TODO: if something fails to load, in debug mode, don't exit
    // immediately. print a reasonable-looking error and watch the
    // files until something changes, and then restart. then,
    // eventually, add an interface that lets a debug-mode helper in
    // the browser find out about the error, retrieve the error text,
    // and display it in a popup :)

    var root = '/server/main.js';
    var main = File.findOrCreate(root)
    if (!main) {
      console.log("Could not find " + main);
      process.exit(1); // don't even try to deal
    }
    var errors = main.preflight();

    if (errors.length > 0) {
      console.log("================");
      console.log("There Are Errors");
      console.log("================");
      errors.forEach(function (e) {
        console.log(e.toString());
      });
    }
    else {
      try {
        main.load();
      } catch (e) {
        console.log(e.stack);
        console.log("<Server load fails>");
      }
    }

    // in debug mode, if server-side source files change, restart the
    // server
    if (is_debug_mode)
      main.onDirty(restart);

    process.on('uncaughtException', function (e) {
      console.log("=== Exception ===");
      console.log(e.stack);
      console.log("[Restarting]");
      // TODO: make everything stop, but still wait for a code
      // change. Probably by restarting ourselves with a special flag
      // that says to read everything, eval nothing, and wait for a
      // code change.
      process.exit(17);
    });
  };

  return main;
})()(); // run main()
