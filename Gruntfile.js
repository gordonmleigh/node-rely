'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          timeout: 500
        },
        src: ['test/*.js']
      }
    },
    jshint: {
      options: {
        "curly": true,
        "eqeqeq": true,
        "immed": true,
        "latedef": true,
        "newcap": true,
        "noarg": true,
        "sub": true,
        "undef": true,
        "unused": true,
        "boss": true,
        "eqnull": true,
        "node": true
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib: {
        src: ['lib/**/*.js']
      },
      test: {
        src: ['test/*.js']
      },
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib: {
        files: '<%= jshint.lib.src %>',
        tasks: ['jshint:lib', 'mochaTest']
      },
      test: {
        files: '<%= jshint.test.src %>',
        tasks: ['jshint:test', 'mochaTest']
      },
    },
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-conventional-changelog');

  // Default task.
  grunt.registerTask('default', ['jshint', 'mochaTest']);

};
