/*global describe, it, before*/
/**
 * rely
 * https://github.com/gordonml/node-rely
 *
 * Copyright (c) 2013 Gordon Mackenzie-Leigh
 * Licensed under the MIT license.
 */

'use strict';

var chai = require('chai'),
    expect = chai.expect,
    chaiAsPromised = require('chai-as-promised'),
    rely = require('../lib/rely.js')();

chai.use(chaiAsPromised);

describe('rely#_getCjsDependencies()', function () {
  it('returns a list of dependencies determined from require() statements', function () {
    var fn = function (require, exports, module) {
      var dep1 = require('dep1'),
          dep2 = require('dep2');
      var dep3 = require('dep3');
      return [dep1, dep2, dep3, require, exports, module];
    };
    var deps = rely._getCjsDependencies(fn);
    expect(deps).to.deep.equal(['require', 'exports', 'module', 'dep1', 'dep2', 'dep3']);
  });
});

describe('rely#_createModuleFunction()', function () {
  var fn;
  before(function () {
    fn = rely._createModuleFunction('return Array.prototype.slice.call(arguments);');
  });

  it('returns a function', function () {
    expect(fn).to.be.a('function');
  });

  it('overrides global variables', function () {
    var args = [{}, {}, {}, {}, {}, {}],
        cmp = fn.apply(null, args);
    expect(cmp).to.deep.equal(args);
  });
});

describe('rely#loadFile()', function () {
  describe('when called with a file containing a CommonJS module', function () {
    before(function (done) {
      rely.loadFile('./test/fixtures/cjslib.js', 'testlib', done);
    });

    it('takes the module definition from module.exports', function () {
      expect(rely.modules).to.have.keys('testlib');
      var m = rely.modules['testlib'].get();
      expect(m).to.have.keys(['foo', 'bar']);
    });
  });
  describe('when called with a file containing an anonymous define', function () {
    before(function (done) {
      rely.loadFile('./test/fixtures/anonlib.js', 'testlib', done);
    });

    it('uses the define factory for the module definition', function () {
      expect(rely.modules).to.have.keys('testlib');
      var m = rely.modules['testlib'].get();
      expect(m).to.have.keys(['foo', 'bar']);
    });
  });
});

describe('rely#require()', function () {
  describe('when called synchronously', function () {
    var def = {};
    var mod = {
      get: function (async) {
        expect(async).to.not.equal(true);
        return def;
      }
    };

    before(function () {
      rely.modules['testlib'] = mod;
    });

    it('returns the requested module', function () {
      var m = rely.require('testlib');
      expect(m).to.equal(def);
    });
  });

  describe('when called asynchronously', function () {
    var def = {};
    var mod = {
      get: function (async) {
        expect(async).to.equal(true);
        return def;
      }
    };

    before(function () {
      rely.modules['testlib'] = mod;
    });

    it('returns a promise which resolves to the requested module', function () {
      var m = rely.require('testlib', true);
      expect(m).to.equal(def);
    });
  });

  describe('when called with "rely"', function () {
    it('returns self instance', function () {
      var m = rely.require('rely');
      expect(m).to.equal(rely);
    });
  });

  describe('when called with "fs"', function () {
    it('returns the built-in module', function () {
      var m = rely.require('fs');
      expect(m).to.equal(require('fs'));
    });
  });
});

describe('rely#run()', function () {
  var one = {}, two = {};

  before(function () {
    rely.define('one', 'one', [], function () { return one; });
    rely.define('two', 'two', [], function () { return two; });
  });

  it('calls the function with the given modules', function (done) {
    rely.run(['one','two'], function (o, t) {
      expect(o).to.equal(one);
      expect(t).to.equal(two);
      done();
    });
  });
});


describe('rely#map()', function () {
  describe('when called with a string', function () {
    it('stores the string in the module list', function () {
      rely.map('foo', 'bar');
      var m = rely.modules['foo'];
      expect(m).to.equal('bar');
    });
  });
  describe('when called with an object', function () {
    it('creates a module with the definition set to the object', function () {
      var def = {};
      rely.map('foo', def);
      var m = rely.modules['foo'].get();
      expect(m).to.equal(def);
    });
  });
});