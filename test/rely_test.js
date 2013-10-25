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
    rely = require('../lib/rely.js')();

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


describe('rely#loadfile()', function () {
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