# rely

Simple dependency injection and library loader for [node](http://nodejs.org/).  


## Usage

Rely allows you to depend on named libraries which can be overriden in the configuration.  The default options allow rely to fall back to node's `require()` so that everything uses the default implementations unless overriden.

```javascript
var rely = require('rely')(options);

var some_library = rely('some_library');  // get an implementation
rely('other_library', implementation);    // set an implementation
```
    
You should `require()` rely once in your main script, then use it to load all other dependencies.  This way, all other modules share a common container (dependency configuration).  Rely can load modules that have not been designed to use rely, but obviously the dependencies for those modules cannot be overriden.


### Automatic dependency injection

Rely also supports automatic dependency injection for modules designed to support this.  Consider the following contrived example:

```javascript
module.exports = function(lodash, glob, path) { // depend on lodash, glob and path
    return {
        getFiles: function (pattern) {
            return lodash.map(glob.sync(pattern), function (f) { 
                return path.basename(f); 
            });
        }
    };
};

// mark the module as supporting rely auto-loading
module.exports.$rely = true;
```

If this module is loaded with rely, the dependencies will be automatically satisfied according to the argument names.  The module can also be loaded without rely, by specifying the arguments manually.

If the module will be minified (thus changing the argument names), or you would like to use different names for the dependencies, the dependencies can be specified explicitly as follows:

```javascript
module.exports.$rely = ['lodash', 'glob', 'path'];
```
    
The module wrapping function will only be called the first time the module is loaded by rely.  It will then be cached for subsequent accesses.
    

### Setup

Depdencies can be specified one at a time by calling `rely()` with two arguments:

```javascript
// set implementation to be provided for 'name'
rely('name', implementation);
```
    
If `implementation` is a string value, this maps a path or npm module name to be loaded the first time the dependency is relied on.  E.g.:

```javascript
// set a path to give to node's require() when awesomelib is loaded
rely('awesomelib', './lib/awesomelib.js');
// module is only loaded on first use
var awesome = rely('awesomelib');
```
    
You can also specify all dependencies at the same time by calling `setup()`:

```javascript
rely.setup({
    'foo': foo,
    'bar': bar
});
```

Multiple calls to `setup()` will _add_ to the dependencies, not replace them.  A key of `'*'` will cause all files matching a glob to be loaded.  The modules will be mapped to their basename, excluding the '.js' extension.

```javascript
rely.setup({
    '*': './lib/*.js'  
    // for foo.js and bar.js, will result in dependencies called 'foo' and 'bar'.
});
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
See the [CHANGELOG](CHANGELOG)

## License
Copyright (c) 2013 Gordon Mackenzie-Leigh  
Licensed under the [MIT license](LICENSE-MIT).
