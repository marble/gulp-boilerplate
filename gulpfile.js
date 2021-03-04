const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const unzipper = require('unzipper');

// use 1 to activate task, use 0 to deactivate
let settings = {
  clean         : 1,
  cleanGenerated: 1,
  cleanUnzipped : 1,
  scripts       : 1,
  polyfills     : 1,
  styles        : 1,
  svgs          : 1,
  copy          : 1,
  reload        : 1
};

const paths = {
  input: 'src/',
  output: 'dist/',
  output_generated: 'GENERATED/',
  output_unzipped: 'GENERATED/UNZIPPED',
  scripts: {
    input: 'src/js/**/*.{js}',
    polyfills: '.polyfill.js',
    output: 'dist/js/'
  },
  styles: {
    input: 'src/sass/**/*.{scss,sass}',
    output: 'dist/css/'
  },
  svgs: {
    input: 'src/svg/*.svg',
    output: 'dist/svg/'
  },
  copy: {
    input: 'src/copy/**/*',
    output: 'dist/'
  },
  reload: './dist/',
  npm_distributions: {
    'bootstrap'                : path.normalize(path.join(require.resolve('bootstrap'       ), '../../../dist')),
    'jquery'                   : path.normalize(path.join(require.resolve('jquery'          ), '../../dist')),
    'smartmenus'               : path.normalize(path.join(require.resolve('smartmenus'      ), '..')),
    'js-cookie'                : path.normalize(path.join(require.resolve('js-cookie'       ), '..')),
    'responsive-tabs-js'       : path.normalize(path.join(require.resolve('responsive-tabs' ), '../../js')),
    'slick-carousel'           : path.normalize(path.join(require.resolve('slick-carousel'  ), '../slick')),
    'fontawesome-free'         : path.normalize(path.join(require.resolve('@fortawesome/fontawesome-free' ), '../..')),
    'fontawesome-free-webfonts': path.normalize(path.join(require.resolve('@fortawesome/fontawesome-free' ), '../../webfonts')),
  }
};

// Template for file header banner
let banner = {
  main:
    '/*!' +
    ' <%= package.name %> v<%= package.version %>' +
    ' | (c) ' + new Date().getFullYear() + ' <%= package.author.name %>' +
    ' | <%= package.license %> License' +
    ' | <%= package.repository.url %>' +
    ' */\n'
};

// general
const gulp = require('gulp');
const {src, dest, watch, series, parallel} = require('gulp');
const del      = require('del');
const flatmap  = require('gulp-flatmap');
const lazypipe = require('lazypipe');
const rename   = require('gulp-rename');
const header   = require('gulp-header');
const packagejson = require('./package.json');

// scripts
const concat     = require('gulp-concat');
const jshint     = require('gulp-jshint');
const optimizejs = require('gulp-optimize-js');
const stylish    = require('jshint-stylish');
const uglify     = require('gulp-terser');

// css
const minify  = require('cssnano');
const postcss = require('gulp-postcss');
const prefix  = require('autoprefixer');
const sass    = require('gulp-sass');

// other
const svgmin      = require('gulp-svgmin');
const browserSync = require('browser-sync');

/*
 * Split the string at the first occurrence of sep, and return a 3-items array containing the part before the
 * separator, the separator itself, and the part after the separator. If the separator is not found, return
 * a 3-item array containing the string itself, followed by two empty strings.
 */
function partition(s, sep) {
  'use strict';
  let p = s.indexOf(sep);
  if (p === -1) {
    return [s, '', ''];
  } else {
    return [s.substr(0, p), sep, s.substr(p + sep.length)];
  }
}

function defaultTask(done) {
  'use strict';
  console.log('run `gulp -T` or `gulp --tasks-simple` for task list');
  done();
}

// can be used in function calls that require an error callback
function exitOnErrorCb(err) {
  'use strict';
  console.log('Exiting in function: exitOnErrorCb');
  console.log(err);
  process.exit(1);
}

function cleanDist(done) {
  'use strict';
  if (settings.clean) {
    del.sync([
      paths.output
    ]);
  }
  done();
}

function cleanGenerated(done) {
  'use strict';
  if (settings.cleanGenerated) {
    del.sync([
      paths.output_generated
    ]);
  }
  done();
}

function cleanUnzipped(done) {
  'use strict';
  if (settings.cleanUnzipped) {
    del.sync([
      paths.output_unzipped
    ]);
  }
  done();
}

let jsTasks = lazypipe()
  .pipe(header, banner.main, {package: packagejson})
  .pipe(optimizejs)
  .pipe(dest, paths.scripts.output)
  .pipe(rename, {suffix: '.min'})
  .pipe(uglify)
  .pipe(optimizejs)
  .pipe(header, banner.main, {package: packagejson})
  .pipe(dest, paths.scripts.output);

let jsTasksFull = lazypipe()
  .pipe(header, banner.main, {package: packagejson})
  .pipe(optimizejs)
  .pipe(dest, paths.scripts.output)
  .pipe(rename, {suffix: '.min'})
  .pipe(uglify)
  .pipe(optimizejs)
  .pipe(header, banner.main, {package: packagejson})
  .pipe(dest, paths.scripts.output);


// lint, minify, concatenate
var buildScripts = function (done) {
  'use strict';
  if (!settings.scripts) {
    return done();
  }
  return src(paths.scripts.input)
    .pipe(flatmap(function(stream, file) {
      if (file.isDirectory()) {
        let suffix = '';
        if (settings.polyfills) {
          suffix = '.polyfills';
          // Grab files that aren't polyfills, concatenate them, and process them
          src([file.path + '/*.js', '!' + file.path + '/*' + paths.scripts.polyfills])
            .pipe(concat(file.relative + '.js'))
            .pipe(jsTasks());
        }
        // concatenate all
        // If separate polyfills enabled, this will have .polyfills in the filename
        src(file.path + '/*.js')
          .pipe(concat(file.relative + suffix + '.js'))
          .pipe(jsTasks());
        return stream;
      } else {
        // process file
        return stream.pipe(jsTasks());
      }
    }));
};

function lintScripts(done) {
  'use strict';
  if (!settings.scripts) {
    return done();
  }
  return src(paths.scripts.input)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
}

// process, lint, and minify Sass files
function buildStyles(done) {
  'use strict';
  if (!settings.styles) {
    return done();
  }
  return src(paths.styles.input)
    .pipe(sass({
      outputStyle: 'expanded',
      sourceComments: true
    }))
    .pipe(postcss([
      prefix({
        cascade: true,
        remove: true
      })
    ]))
    .pipe(header(banner.main, {package: packagejson}))
    .pipe(dest(paths.styles.output))
    .pipe(rename({suffix: '.min'}))
    .pipe(postcss([
      minify({
        discardComments: {
          removeAll: true
        }
      })
    ]))
    .pipe(dest(paths.styles.output));

}

// optimize SVG
function buildSVGs(done) {
  'use strict';
  if (!settings.svgs) {
    return done();
  }
  return src(paths.svgs.input)
    .pipe(svgmin())
    .pipe(dest(paths.svgs.output));

}

// copy static files
function copyFiles(done) {
  'use strict';
  if (!settings.copy) {
    return done();
  }
  return src(paths.copy.input)
    .pipe(dest(paths.copy.output));
}

function startServer(done) {
  'use strict';
  if (!settings.reload) {
    return done();
  }
  // https://browsersync.io/docs/options
  browserSync.init({
    server: {
      baseDir: paths.reload
    }
  });
  done();
}

function reloadBrowser(done) {
  'use strict';
  if (settings.reload) {
    browserSync.reload();
  }
  done();
}

function watchSource(done) {
  'use strict';
  watch(paths.input, series(exports.all, reloadBrowser));
  done();
}

const all = series(
  cleanDist,
  parallel(
    buildScripts,
    lintScripts,
    buildStyles,
    buildSVGs,
    copyFiles
  ));


function makeUnzipTask(from_spec, to_spec) {
  'use strict';
  return function (done) {
    fs.createReadStream(from_spec)
      .pipe(unzipper.Extract({path: to_spec}))
      .on('close', done);
  };
}


function getUnzipTasks() {
  'use strict';
  let arr = [];
  mkdirp.sync(paths.output_unzipped);
  for (let [k, v] of Object.entries(paths.npm_distributions)) {
    let parts = partition(v, '.zip');
    if (parts[1] === '.zip') {
      arr.push(makeUnzipTask(parts[0] + parts[1], paths.output_unzipped));
    }
  }
  return arr;
}

function makeCopyTask(from_spec, to_spec) {
  'use strict';
  return function () {
    return src(from_spec).pipe(dest(to_spec));
  };
}

function getCopyTasks() {
  'use strict';
  let arr = [];
  mkdirp.sync(paths.output_generated);
  for (let [k, v] of Object.entries(paths.npm_distributions)) {
    let parts = partition(v, '.zip');
    if (parts[1] === '.zip') {
      v = path.join(paths.output_unzipped, parts[2]);
    }
    arr.push(makeCopyTask(path.join(v, '**'), path.join(paths.output_generated, k)));
  }
  return arr;
}


exports.all     = all;
exports.cleanDist   = cleanDist;
exports.default = defaultTask;
exports.watch = series(all, startServer, watchSource);

// gp - get packages for development
exports.gp_0_Refresh = series.apply(null, [cleanGenerated].concat(getUnzipTasks(), getCopyTasks()));
exports.gp_1_Clean   = cleanGenerated;
exports.gp_2_Unzip   = series.apply(null, getUnzipTasks());
exports.gp_3_Copy    = series.apply(null, getCopyTasks());
exports.gp_4_CleanUnzipped = cleanUnzipped;

