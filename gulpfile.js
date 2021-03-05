
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
  src: 'src/',
  dest: 'dist/',
  dest_generated: 'GENERATED/',
  dest_unzipped: 'GENERATED/UNZIPPED',
  js: {
    src: 'src/js/**/*.{js}',
    polyfills: '.polyfill.js',
    dest: 'dist/js/'
  },
  css: {
    src: 'src/sass/**/*.{scss,sass}',
    dest: 'dist/css/'
  },
  svgs: {
    src: 'src/svg/*.svg',
    dest: 'dist/svg/'
  },
  copy: {
    src: 'src/copy/**/*',
    dest: 'dist/'
  },
  reload: './dist/',
  vendorFiles: [
    // unique name              // npm package name              // relpath to folder
    ['bootstrap'                , 'bootstrap'                    , '../../../dist' ],
    ['fontawesome-free'         , '@fortawesome/fontawesome-free', '../..'         ],
    ['fontawesome-free-webfonts', '@fortawesome/fontawesome-free', '../../webfonts'],
    ['jquery'                   , 'jquery'                       , '../../dist'    ],
    ['js-cookie'                , 'js-cookie'                    , '..'            ],
    ['responsive-tabs-js'       , 'responsive-tabs'              , '../../js'      ],
    ['slick-carousel'           , 'slick-carousel'               , '../slick'      ],
    ['smartmenus'               , 'smartmenus'                   , '..'            ],
  ]
};


// Template for file header banner
let banner = {
  main:
    '/*!\n' +
    ' * <%= package.name %> v<%= package.version %>\n' +
    ' * <%= package.description %>\n' +
    ' * (c) ' + new Date().getFullYear() + ' <%= package.author.name %>\n' +
    ' * <%= package.license %> License\n' +
    ' * <%= package.repository.url %>\n' +
    ' */\n\n',
  full:
    '/*!\n' +
    ' * <%= package.name %> v<%= package.version %>\n' +
    ' * <%= package.description %>\n' +
    ' * (c) ' + new Date().getFullYear() + ' <%= package.author.name %>\n' +
    ' * <%= package.license %> License\n' +
    ' * <%= package.repository.url %>\n' +
    ' */\n\n',
  min:
    '/*!' +
    ' <%= package.name %> v<%= package.version %>' +
    ' | (c) ' + new Date().getFullYear() + ' <%= package.author.name %>' +
    ' | <%= package.license %> License' +
    ' | <%= package.repository.url %>' +
    ' */\n'
};


// general
const browserSync = require('requireg')('browser-sync');
const del         = require('del');
const flatmap     = require('gulp-flatmap');
const fs          = require('fs');
const gulp        = require('gulp');
const header      = require('gulp-header');
const lazypipe    = require('lazypipe');
const mkdirp      = require('mkdirp');
const packagejson = require('./package.json');
const path = require('path');
const rename      = require('gulp-rename');
const sourcemaps  = require('gulp-sourcemaps');
const unzipper    = require('unzipper');
const { partition } = require('./gulp/util.js');
const { src, dest, watch, series, parallel } = require('gulp');

// scripts
const concat      = require('gulp-concat');
const jshint      = require('gulp-jshint');
const optimizejs  = require('gulp-optimize-js');
const stylish     = require('jshint-stylish');
const uglify      = require('gulp-terser');

// css
const minify      = require('cssnano');
const postcss     = require('gulp-postcss');
const prefix      = require('autoprefixer');
const sass        = require('gulp-sass');

// other
const svgmin      = require('gulp-svgmin');


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
      paths.dest
    ]);
  }
  done();
}

function cleanGenerated(done) {
  'use strict';
  if (settings.cleanGenerated) {
    del.sync([
      paths.dest_generated
    ]);
  }
  done();
}

function cleanUnzipped(done) {
  'use strict';
  if (settings.cleanUnzipped) {
    del.sync([
      paths.dest_unzipped
    ]);
  }
  done();
}

let jsTasks = lazypipe()
  .pipe(header, banner.main, {package: packagejson})
  .pipe(optimizejs)
  .pipe(dest, paths.js.dest)
  .pipe(rename, {suffix: '.min'})
  .pipe(uglify)
  .pipe(optimizejs)
  .pipe(header, banner.main, {package: packagejson})
  .pipe(dest, paths.js.dest);

let jsTasksFull = lazypipe()
  .pipe(header, banner.main, {package: packagejson})
  .pipe(optimizejs)
  .pipe(dest, paths.js.dest)
  .pipe(rename, {suffix: '.min'})
  .pipe(uglify)
  .pipe(optimizejs)
  .pipe(header, banner.main, {package: packagejson})
  .pipe(dest, paths.js.dest);


// lint, minify, concatenate
var buildScripts = function (done) {
  'use strict';
  if (!settings.scripts) {
    return done();
  }
  return src(paths.js.src)
    .pipe(flatmap(function(stream, file) {
      if (file.isDirectory()) {
        let suffix = '';
        if (settings.polyfills) {
          suffix = '.polyfills';
          // Grab files that aren't polyfills, concatenate them, and process them
          src([file.path + '/*.js', '!' + file.path + '/*' + paths.js.polyfills])
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
  return src(paths.js.src)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
}

// process, lint, and minify Sass files
function buildStyles(done) {
  'use strict';
  if (!settings.styles) {
    return done();
  }
  return src(paths.css.src)
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: 'expanded',
      sourceComments: true,
      errLogToConsole: true
    }))
    .pipe(postcss([
      prefix({
        cascade: true,
        remove: true
      })
    ]))
    .pipe(header(banner.main, {package: packagejson}))
    .pipe(dest(paths.css.dest))
    .pipe(rename({suffix: '.min'}))
    .pipe(postcss([
      minify({
        discardComments: {
          removeAll: true
        }
      })
    ]))
    .pipe(sourcemaps.write('./'))
    .pipe(dest(paths.css.dest));

}

// optimize SVG
function buildSVGs(done) {
  'use strict';
  if (!settings.svgs) {
    return done();
  }
  return src(paths.svgs.src)
    .pipe(svgmin())
    .pipe(dest(paths.svgs.dest));

}

// copy static files
function copyFiles(done) {
  'use strict';
  if (!settings.copy) {
    return done();
  }
  return src(paths.copy.src)
    .pipe(dest(paths.copy.dest));
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
  mkdirp.sync(paths.dest_unzipped);
  for (let [k, p, r] of paths.vendorFiles) {
    let v = path.normalize(path.join(require.resolve(p), r));
    let parts = partition(v, '.zip');
    if (parts[1] === '.zip') {
      arr.push(makeUnzipTask(parts[0] + parts[1], paths.dest_unzipped));
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
  mkdirp.sync(paths.dest_generated);
  for (let [k, p, r] of paths.vendorFiles) {
    let v = path.normalize(path.join(require.resolve(p), r));
    let parts = partition(v, '.zip');
    if (parts[1] === '.zip') {
      v = path.join(paths.dest_unzipped, parts[2]);
    }
    arr.push(makeCopyTask(path.join(v, '**'), path.join(paths.dest_generated, k)));
  }
  return arr;
}

function watchSource(done) {
  'use strict';
  watch(paths.copy.src, series(copyFiles   , reloadBrowser));
  watch(paths.js.src  , series(buildScripts, reloadBrowser));
  watch(paths.css.src , series(buildStyles , reloadBrowser));
  done();
}


exports.makeDist = series(
  cleanDist,
  parallel(
    lintScripts,
    buildSVGs,
    buildScripts,
    buildStyles,
    copyFiles
  ));

exports.cleanDist = cleanDist;
exports.default   = defaultTask;
exports.watch     = series(exports.makeDist, startServer, watchSource);

// fp - fetch packages for development to ./GENERATED
exports.fp1_Clean = cleanGenerated;
exports.fp2_Unzip = parallel.apply(null, getUnzipTasks());
exports.fp3_Copy  = parallel.apply(null, getCopyTasks());
exports.fp4_CleanUnzipped = cleanUnzipped;
exports.fp99_All = series(
  exports.fp1_Clean,
  exports.fp2_Unzip,
  exports.fp3_Copy
);

