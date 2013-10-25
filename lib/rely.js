/*
 * rely
 * https://github.com/gordonml/node-rely
 *
 * Copyright (c) 2013 Gordon Mackenzie-Leigh
 * Licensed under the MIT license.
 *
 * Uses some code from RequireJS (Dojo Foundation)
 * Licensed under MIT/BSD.
 * https://github.com/jrburke/requirejs/blob/a11c37db8f908a26fc245fc82f849761f53f4262/LICENSE
 */

'use strict';


// dependencies
var fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    q = require('q'),
    lodash = require('lodash'),
    nodeRequire = require;

// constants
var commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
    cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g;


/**
 * If the argument is a function, return it, otherwise return null.
 */
function asFunction(fn) {
  if (typeof fn === 'function') {
    return fn;
  } else {
    return undefined;
  }
}


/**
 * Returns a result, or a promise for a result, depending on the value of async.
 */
function asyncResult(result, async) {
  if (async) {
    return q(result).nodeify(asFunction(async));
  } else {
    return result;
  }
}


/**
 * Runs a callback now or later.
 */
function then(async, arg, next) {
  if (async) {
    return arg.then(next);
  } else {
    return next(arg);
  }
}


/**
 * Constructor for the module class.
 */
function Module(rely, id, filename, dependencies, factory) {
  var self = this;
  self.rely = rely;
  self.id = id;
  self.filename = filename;
  self.dirname = filename ? path.dirname(filename) : null;
  self.dependencies = dependencies;
  self.factory = factory;
  self.loaded = false;
  self.exports = {};

  self.nodeModule = {
    id: id,
    filename: filename,
    require: self.require,
    loaded: false,
    parent: module,
    exports: self.exports
  };
}


/**
 * Resolves dependencies for the current module.
 */
Module.prototype.require = function rely_module_require(dep, async) {
  var self = this;
  // check for array of dependencies
  if (Array.isArray(dep)) {
    dep = lodash.map(dep, function (dep) {
      return self.require(dep, !!async);
    });
    if (async) {
      return q.all(dep).nodeify(asFunction(async));
    } else {
      return dep;
    }
  }
  // built in deps
  if (dep === 'module') {
    return self;
  } else if (dep === 'require') {
    return self.require;
  } else if (dep === 'exports') {
    return self.exports;
  } else {
    return self.rely.require(dep, self.dirname);
  }
};


/**
 * Gets the implementation for the module.
 */
Module.prototype.get = function rely_module_get(async) {
  var self = this,
      def,
      defCache = self.exports;

  // return the implementation if already loaded.
  if (self.loaded) {
    return asyncResult(self.exports, async);
  }
  // run async or sync
  return then(
    async,
    self.require(self.dependencies, async),
    function (deps) {
      def = self.factory.apply(self, deps);
      if (self.exports === defCache || Object.keys(defCache) === 0) {
        // module hasn't used module.exports for definition
        self.exports = def;
      }
      return self.exports;
    }
  );
};


/**
 * The constructor for the rely class.
 */
function Rely(options) {
  this.options = lodash.extend({
    cwd: process.cwd()
  }, options);
  this.modules = {};
}


Rely.Module = Module;


/**
 * Maps an alias to a file, module id or implementation.
 */
Rely.prototype.map = function rely_map(alias, def) {
  var self = this;
  // could be multi-map
  if (lodash.isObject(alias)) {
    for(var k in alias) {
      self.map(k, alias[k]);
    }
  } else if (typeof def === 'string') {
    self.modules[alias] = def;
  } else {
    self.modules[alias] = new Module(self, alias, null, [], function () {
      return def;
    });
  }
  return self;
};


/**
 * Loads the given dependencies and runs the callback on completion.
 */
Rely.prototype.run = function rely_run(dependencies, callback) {
  this.require(dependencies, true)
    .spread(callback)
    .done();
};


/**
 * Defines a new module.
 */
Rely.prototype.define = function rely_define(id, filename, dependencies, factory) {
  var self = this,
      mod;
  if (!id || typeof id !== 'string') {
    throw new Error('The id must be specified.');
  }
  // filename not specified
  if (typeof filename !== 'string') {
    factory = dependencies;
    dependencies = filename;
    filename = null;
  }
  // dependencies not specified
  if (!factory) {
    factory = dependencies;
  }
  // attempt to parse dependencies from require() calls in function definition
  if (!dependencies && typeof(factory) === 'function') {
    dependencies = self._getCjsDependencies(factory);
  }
  mod = new Module(self, id, filename, dependencies, factory);
  this.modules[id] = mod;
  return mod;
};


/**
 * Resolves dependencies.
 */
Rely.prototype.require = function rely_require(dependency, cwd, async) {
  var self = this,
      def, promise, filename, m;
  // cwd not specified
  if (typeof cwd !== 'string') {
    async = cwd;
    cwd = self.options.cwd;
  }
  // handle requiring multiple dependencies
  if (Array.isArray(dependency)) {
    if (async) {
      promise = lodash.map(dependency, function (d) {
        return self.require(d, cwd, true);
      });
      return q.all(promise).nodeify(asFunction(async));
    } else {
      lodash.map(dependency, function (d) {
        return self.require(d, cwd);
      });
    }
  }
  // load as file if dependency starts with '/', './' or '../'
  if (/^\.?\.?\//.test(dependency)) {
    dependency = path.resolve(cwd, dependency);
  }
  // return instance of self for 'rely' module
  if (dependency === 'rely') {
    return asyncResult(self, async);
  }
  // check cache, load otherwise
  if (dependency in self.modules) {
    def = self.modules[dependency];
    if (typeof def === 'string') {
      // definition is alias
      m = self.require(m, self.cwd, !!async);
      self.modules[dependency] = m;
      if (async) {
        m = m.then(function (value) {
          self.modules[dependency] = value;
        }).nodeify(asFunction(async));
      }
      return m;
    } else if (q.isPromise(m)) {
      // module is still being loaded by another call to require.
      if (!async) {
        throw new Error('the module has not been loaded yet');
      } else {
        // the promise will resolve to the module.exports
        return m.nodeify(asFunction(async));
      }
    } else {
      return def.get(async);
    }
  } else {
    // find module implementation
    filename = self.resolve(dependency);
    // check for builtin module
    if (filename[0] !== '/') {
      return asyncResult(nodeRequire(filename), async);
    }
    // load the file
    if (async) {
      return self.loadFile(filename, dependency, true)
        .then(function (def) {
          return def.exports;
        })
        .nodeify(asFunction(async));
    } else {
      return self.loadFile(filename, dependency).exports;
    }
  }
};


/**
 * Resolves a module name to a definition file.
 */
Rely.prototype.resolve = function rely_resolve(moduleName) {
  return nodeRequire.resolve(moduleName);
};


/**
 * Loads a script from the file system.
 */
Rely.prototype.loadFile = function rely_loadFile(filename, id, async) {
  var self = this,
      dir = path.dirname(filename),
      m, next, mrequire, mdefine;
  // id not supplied
  if (typeof id !== 'string') {
    id = filename;
    async = id;
  }
  // module variable to pass to the factory function
  m = {
    id: id,
    filename: filename,
    exports: {}
  };
  // module-specific require function
  mrequire = function (dep) {
    return self.require(dep, dir);
  };
  // define function that allows omitting id
  mdefine = function (mid, dependencies, factory) {
    // no id
    if (typeof mid !== 'string') {
      factory = dependencies;
      dependencies = mid;
      mid = id;
    }
    // no dependencies
    if (!Array.isArray(dependencies)) {
      factory = dependencies;
      dependencies = [];
    }
    return self.define(mid, dependencies, factory);
  };
  // function to run after loading file
  next = function (code) {
    var fn = self._createModuleFunction(code, filename),
        def;
    // run the module code
    fn(m, m.exports, mrequire, mdefine, filename, dir);
    // create a module definition if it wasn't define()d.
    def = self.modules[id];
    if (def === undefined) {
      def = new Module(self, id, filename, [], function () { return m.exports; });
      self.modules[id] = def;
    }
    return def;
  };

  if(async) {
    return q.nfcall(fs.readFile, filename, 'utf8').then(next).nodeify(asFunction(async));
  } else {
    return next(fs.readFileSync(filename, 'utf8'));
  }
};


/**
 * Wraps the given code in a function and compiles it, returning the function.
 */
Rely.prototype._createModuleFunction = function rely__createModuleFunction(code, filename) {
  // wrap code to override globals.
  code = '(function rely_moduleLoaderWrapper(module, exports, require, define, __filename, __dirname) {' +
    code +
    '\n})';
  // compile the module
  return vm.runInThisContext(code, filename);
};


/**
 * Parses the function code to find calls to require().
 */
Rely.prototype._getCjsDependencies = function rely__getCjsDependencies(fn) {
  // Borrowed from RequireJS (Dojo Foundation)
  // MIT/BSD License (https://github.com/jrburke/requirejs/blob/a11c37db8f908a26fc245fc82f849761f53f4262/LICENSE)
  // https://github.com/jrburke/requirejs/blob/a11c37db8f908a26fc245fc82f849761f53f4262/require.js#L1994
  var dependencies = [];
  // Remove comments from the callback string,
  // look for require calls, and pull them into the dependencies,
  // but only if there are function args.
  if (fn.length) {
    fn.toString()
      .replace(commentRegExp, '')
      .replace(cjsRequireRegExp, function (match, dep) {
        dependencies.push(dep);
      });

    // May be a CommonJS thing even without require calls, but still
    // could use exports, and module. Avoid doing exports and module
    // work though if it just needs require.
    // REQUIRES the function to expect the CommonJS variables in the
    // order listed below.
    dependencies = (fn.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(dependencies);
  }
  return dependencies;
};


module.exports = function (options) {
  return new Rely(options);
};