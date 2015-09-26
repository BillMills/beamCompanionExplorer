module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
      qunit: {
        all: {
          options: {
            urls: [
              'http://localhost:8000/tests/tests.html'
            ]
          }
        }
      },
      connect: {
        server: {
          options: {
            port: 8000,
            base: '.'
          }
        }
      }
    });

    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-connect');

    // A convenient task alias.
    grunt.registerTask('test', ['connect', 'qunit']);
};

