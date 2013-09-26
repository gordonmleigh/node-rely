/*
 * rely
 * https://github.com/gordonml/node-rely
 *
 * Copyright (c) 2013 Gordon Mackenzie-Leigh
 * Licensed under the MIT license.
 */

'use strict';

var _rely = require('../lib/rely.js');

exports['rely'] = {
  'sets a dependency when called with 2 arguments': function(test) {
    var rely = _rely();
    var dependency = function () {};
    // set the dependency
    rely('test', dependency);
    // check it worked
    test.ok('test' in rely.dependencies, 'expected element "test" in dependencies');
    test.strictEqual(rely.dependencies['test'], dependency, 'the dependency should equal the original');
    test.done();
  },

  'gets a dependency when called with 1 arugment': function(test) {
    var rely = _rely();
    var dependency = function () {};
    rely.dependencies['test'] = dependency;
    // get the dep
    var value = rely('test');
    // check
    test.strictEqual(value, dependency, 'the retrieved dependency should equal the original');
    test.done();
  },

  'returns self when called with argument "rely"':  function (test) {
    var rely = _rely();
    var self = rely('rely');
    test.strictEqual(self, rely, 'the function should return itself');
    test.done();
  },

  'calls require() when dependency not found': function (test) {
    var rely = _rely();
    var a = require('fs');
    var b = rely('fs');
    test.strictEqual(b, a, 'rely should call require() if dependency is not found');
    test.done();
  },

  'calls require() for local modules when dependency not found': function (test) {
    var rely = _rely();
    var b = rely('./test/fixtures/testlib.js');
    test.equal(b.name, 'testlib', 'rely should call require() if dependency is not found');
    test.done();
  },

  'throws error if dependency not found by require()': function (test) {
    var rely = _rely();

    test.throws(
      function() {
        rely('some-unknown-module');
      },
      Error,
      'should throw Error'
    );

    test.done();
  },

  'throws error if dependency not found and autoRequire is false': function (test) {
    var rely = _rely({ autoRequire: false });

    test.throws(
      function() {
        rely('fs');
      },
      Error,
      'should throw Error'
    );

    test.done();
  },

  '.getParameterNames() returns correct names': function (test) {
    var rely = _rely();
    var func = /* snarl it up! */ function name (/* another comment */ one, two /* again, noise! */, three) { return one+two+three; };
    var names = rely.getParameterNames(func);
    test.deepEqual(names, ['one','two','three'], 'the names should be correct and in-order');
    test.done();
  },

  '.autoRequire() calls injectModule() for module functions with $rely property': function (test) {
    var rely = _rely();
    var require_called = false;
    var inject_called = false;

    var dep = function () {};
    dep.$rely = true;

    rely.require = function (name) {
      require_called = true;
      test.equal(name, 'dep', 'require() should have been called with "dep"');
      return dep;
    };

    rely.injectModule = function (module) {
      inject_called = true;
      test.strictEqual(module, dep, 'injectModule() should have been called with dep');
      return module;
    };

    var result = rely('dep');

    test.strictEqual(require_called, true, 'require() should have been called');
    test.strictEqual(inject_called, true, 'injectModule() should have been called');
    test.strictEqual(result, dep, 'rely() should return the dependency');
    test.done();
  },

  '.rely() calls autoRequire for dependency implementations expressed as string': function (test) {
    var rely = _rely();
    var require_called = false;
    var inject_called = false;

    var dep = function () {};
    dep.$rely = true;

    rely.require = function (name) {
      require_called = true;
      test.equal(name, '/path/to/dep', 'require() should have been called with "/path/to/dep"');
      return dep;
    };

    rely.injectModule = function (module) {
      inject_called = true;
      test.strictEqual(module, dep, 'injectModule() should have been called with dep');
      return module;
    };

    rely('dep', '/path/to/dep');
    var result = rely('dep');

    test.strictEqual(require_called, true, 'require() should have been called');
    test.strictEqual(inject_called, true, 'injectModule() should have been called');
    test.strictEqual(result, dep, 'rely() should return the dependency');
    test.strictEqual(rely.dependencies['dep'], dep, 'the loaded implementation should be cached');
    test.done();
  },

  '.injectModule() injects dependencies for functions with no .$rely array': function (test) {
    var rely = _rely();
    var require_called = {};
    var dep_called = false;
    var ret = {};

    var deps = {
      'dep': function (one, two) {
        dep_called = true;
        test.strictEqual(one, deps.one, 'the injected instance should equal the original');
        test.strictEqual(two, deps.two, 'the injected instance should equal the original');
        return ret;
      },
      'one': {},
      'two': {}
    };

    rely.require = function (name) {
      require_called[name] = true;
      return deps[name];
    };

    var result = rely.injectModule(deps.dep);
    test.ok(dep_called, 'the dependency function should have been called');
    test.strictEqual(result, ret, 'the result should equal the return of the dependency function');
    test.ok(require_called.one === true, 'require() should have been called with "one"');
    test.ok(require_called.two === true, 'require() should have been called with "two"');
    test.done();
  },

  '.injectModule() injects dependencies for functions with a .$rely array': function (test) {
    var rely = _rely();
    var require_called = {};
    var dep_called = false;
    var ret = {};

    var deps = {
      'dep': function (a, b) {
        dep_called = true;
        test.strictEqual(a, deps.one, 'the injected instance should equal the original');
        test.strictEqual(b, deps.two, 'the injected instance should equal the original');
        return ret;
      },
      'one': {},
      'two': {}
    };

    deps.dep.$rely = ['one', 'two'];

    rely.require = function (name) {
      require_called[name] = true;
      return deps[name];
    };

    var result = rely.injectModule(deps.dep);
    test.ok(dep_called, 'the dependency function should have been called');
    test.strictEqual(result, ret, 'the result should equal the return of the dependency function');
    test.ok(require_called.one === true, 'require() should have been called with "one"');
    test.ok(require_called.two === true, 'require() should have been called with "two"');
    test.done();
  },


  '.autoRequire() does not call functions without a $rely property': function (test) {
    var rely = _rely();
    var require_called = {};
    var dep_called = false;

    var deps = {
      'dep': function () {
        dep_called = true;
        return {};
      }
    };

    rely.require = function (name) {
      require_called[name] = true;
      return deps[name];
    };

    rely('dep');
    test.strictEqual(dep_called, false, 'the dependency function should not have been called');
    test.done();
  },

  '.autoLoad() adds dependencies for all matching scripts': function (test) {
    var rely = _rely();
    var files = ['/foo/bar/one.js', '/foo/bar/two.js'];
    var glob = {
      'sync': function() {
        return files;
      }
    };

    // fake dependency
    rely('glob', glob);
    rely.autoLoad('*');

    test.equal(rely.dependencies['one'], files[0], '"one" should be added to dependencies');
    test.equal(rely.dependencies['two'], files[1], '"two" should be added to dependencies');
    test.done();
  },

  '.setup() adds specificed dependencies': function (test) {
    var rely = _rely();
    var one = {};
    var two = {};

    rely.setup({
      'one': one,
      'two': two
    });

    test.strictEqual(rely.dependencies.one, one, 'the added dependency should equal the original');
    test.strictEqual(rely.dependencies.two, two, 'the added dependency should equal the original');
    test.done();
  },

  '.setup() calls autoLoad() when the config object contains a "*" key': function (test) {
    var rely = _rely();
    var autoSetup_called = false;
    var the_pattern = 'this is the pattern';

    rely.autoLoad = function (pattern) {
      test.equal(pattern, the_pattern, 'the pattern supplied to autoSetup should be the same as the original');
      autoSetup_called = true;
      return {};
    };

    rely.setup({
      '*': the_pattern
    });

    test.ok(autoSetup_called, 'the autoLoad() function should have been called');
    test.done();
  }
};
