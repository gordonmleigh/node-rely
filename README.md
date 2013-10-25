# rely

Simple dependency injection and library loader for [node](http://nodejs.org/).


## Usage

Rely allows you to depend on named libraries which can be overriden in the configuration.

```javascript
var rely = require('rely')(options);

rely.run(['dependency1', 'dependency2'], function (dep1, dep2) {
  // the dependencies will be automatically injected.
  dep1.doSomeCoolStuff();
});
```

You should `require()` rely once in your main script, then use it to load all other dependencies.
This way, all other modules share a common container (dependency configuration).  Rely can load
modules that have not been designed to use Rely, and the dependencies for those modules will still
be overriden.


### AMD - Asynchronous Module Definition

To make the best use of Rely, define modules using the
[Asynchronous Module Definition](https://github.com/amdjs/amdjs-api/wiki/AMD):

```javascript
define("alpha", ["require", "exports", "beta"], function (require, exports, beta) {
  exports.verb = function() {
    return beta.verb();
    //Or:
    return require("beta").verb();
  }
});
```


### Setup

As well as loading modules that have been defined using `define()`, modules can be mapped to files
by calling `map()`:

```javascript
// set implementation to be provided for 'name'
rely.map('name', implementation);
```

The value `implementation` can be the name of another module to alias, the path to the
implementation script, or any value to set as the implementation.

You can also specify all dependencies at the same time by calling `map()` with an object:

```javascript
rely.map({
  'foo': foo,
  'bar': bar
});
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for
any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
See the [CHANGELOG](CHANGELOG)

## License
Copyright (c) 2013 Gordon Mackenzie-Leigh
Licensed under the [MIT license](LICENSE-MIT).
