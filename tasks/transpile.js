module.exports = function( grunt ) {

  var CWD = process.cwd();

  var fs = require( 'fs-extra' );
  var path = require( 'path' );
  var transpiler = require( 'es6-module-transpiler' );
  var Container = transpiler.Container;
  var FileResolver = transpiler.FileResolver;
  var BundleFormatter = transpiler.formatters.bundle;

  grunt.task.registerMultiTask( 'transpile' , 'transpile es6 modules' , function() {
    var that = this;
    var data = grunt.task.normalizeMultiTaskFiles( that.data )[0];
    var options = that.options({ inject: [] });

    var src = path.join( CWD , path.dirname( data.src[0] ));
    var dest = path.join( CWD , data.dest );
    var index = path.join( CWD , data.index );

    // inject these globals into closure for better minification
    var leadingInjectArgs = options.inject.map(function( arg ) {
      return Array.isArray( arg ) ? arg.shift() : arg;
    });
    var trailingInjectArgs = options.inject.map(function( arg ) {
      return Array.isArray( arg ) ? arg.pop() : arg;
    });

    var container = new Container({
      resolvers: [new FileResolver([ src ])],
      formatter: new BundleFormatter()
    });

    fs.ensureDirSync( path.dirname( dest ));
    container.getModule( index );
    container.write( dest );

    var transpiled = fs.readFileSync( dest , 'utf-8' );

    // remove the sourcemap url
    transpiled = transpiled.replace( /[^\w\)\;]*sourceMappingURL.*/ , '' );

    // add injection args to leading anonymous wrapper
    var leadingArgInjectRegex = /\(function\(\)\s?{/;
    transpiled = transpiled.replace( leadingArgInjectRegex , '(function(' + leadingInjectArgs + ') {' );

    // replace trailing "call" with "apply" and injection args
    var trailingArgInjectRegex = /\.call\(this\)\;(?=(\n*((\/\/|\/\*).*(\*\/)?)?)$)/;
    transpiled = transpiled.replace( trailingArgInjectRegex , '.apply(this,[' + trailingInjectArgs + ']);' );

    fs.writeFileSync( dest , transpiled );
  });

};