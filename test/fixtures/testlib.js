/*
 * rely
 * https://github.com/gordonml/node-rely
 *
 * Copyright (c) 2013 Gordon Mackenzie-Leigh
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(path) {
  return {
    name: 'testlib',
    path: path
  };
};

module.exports.$rely = true;