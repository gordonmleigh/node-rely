/*
 * rely
 * https://github.com/gordonml/node-rely
 *
 * Copyright (c) 2013 Gordon Mackenzie-Leigh
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(_options) {
    /**
     * Gets or sets a dependency module.
     */
    function rely(name, value) {
        if (value === undefined) {
            var dep;
            
            if (name === 'rely') {
                // special case for returning self
                return rely;
            } else {
                // get dep
                dep = rely.dependencies[name];
            }

            if (typeof dep === 'string') {
                // delayed loading auto-require
                return rely.autoRequire(dep);
            } else if (dep !== undefined) {
                return dep;
            } else if (rely.options.autoRequire === true) {
                return rely.autoRequire(name);
            } else {
                throw new Error('Dependency not found: ' + name);
            }
        } else {
            // set dep
            return rely.dependencies[name] = value;
        }
    }
    
    
    // default options
    rely.options = {
        autoRequire: true
    };

    // merge the options
    if (typeof _options === 'object') {
        for (var key in _options) {
            rely.options[key] = _options[key];
        }
    }

    // the list of dependencies
    rely.dependencies = {};
    
    
    /**
     * Maps dependencies to implementations.
     */
    rely.setup = function rely_setup(config) {
        if (typeof config !== 'object') {
            throw new TypeError('rely: config should be an object with "key: implementation" pairs');
        }
        
        for (var key in config) {
            if (key === '*') {
                rely.autoLoad(config[key]);
            } else {
                rely(key, config[key]);
            }
        }
    };
    
    
    /**
     * Automatically loads modules from the file system.
     */
    rely.autoLoad = function rely_autoLoad(pattern) {
        // allows overriding of dependencies before call to this function
        var glob = rely('glob');
        var path = rely('path');
        var files = glob.sync(pattern);
        
        for (var i in files) {
            var name = path.basename(files[i], '.js');
            rely(name, files[i]);
        }
    };


    /**
     * Handles dependency injection for automatically loaded modules
     * via require().
     */
    rely.autoRequire = function rely_autoRequire(name) {
        var module = rely.require(name);
        
        if (typeof module === 'function') {
            var deps;
            if (module.$rely !== undefined) {
                if (Array.isArray(module.$rely)) {
                    deps = module.$rely;
                } else if (module.$rely === true) {
                    // try load dependencies from param names.
                    deps = rely.getParameterNames(module);
                }
            }
            
            var args = [];
                
            for (var i in deps) {
                args.push(rely(deps[i]));
            }
            
            module = module.apply(undefined, args);
        }
        
        return rely(name, module);
    };
    
    
    /**
     * Stub method to allow testing.
     */
    rely.require = function rely_require(path) {
        return require(path);
    };


    var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
    var FN_ARG_SPLIT = /,/;
    var FN_ARG = /^\s*(_?)(.+?)\1\s*$/;
    var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;


    /**
     * Gets the names of arguments from a function.
     * Based on angular source code (MIT license):
     * https://github.com/angular/angular.js/blob/44b6b72e5e9d193ec878ac7a4f25a00815f68cca/src/auto/injector.js
     */
    rely.getParameterNames = function getParameterNames(func) {
        var funcText = func.toString().replace(STRIP_COMMENTS, '');
        var paramDecl = funcText.match(FN_ARGS);
        var params = paramDecl[1].split(FN_ARG_SPLIT);
        var names = [];
        
        function add(all, underscore, name) {
            names.push(name);
        }

        for (var i in params) {
            // shorthand to call given function on each match
            // uses standard js replace, using function as argument
            // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter
            params[i].replace(FN_ARG, add);
        }
        
        return names;
    };


    return rely;
};
