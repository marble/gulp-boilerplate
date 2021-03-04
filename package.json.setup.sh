#!/bin/bash

if ((0)); then
  # set up node, npm, npx
  nvm --version
  nvm ls-remote
  nvm install v15.11.0
  nvm alias default node
  node --version
  npm --version
  npx --version
fi

if ((0)); then
  # global npm installs
  npm install -g yarn
  npm install -g gulp-cli
fi

if ((0)); then
  # prepare yarn
  rm .yarnrc.yml
  yarn set version berry
  cat .yarnrc.initFields.yml >> .yarnrc.yml
  yarn init
fi

if ((0)); then
  # requirements for cferdinandi gulpfile
	yarn add --dev autoprefixer
	yarn add --dev browser-sync
	yarn add --dev cssnano
	yarn add --dev del
	yarn add --dev gulp
	yarn add --dev gulp-concat
	yarn add --dev gulp-flatmap
	yarn add --dev gulp-header
	yarn add --dev gulp-jshint
	yarn add --dev gulp-optimize-js
	yarn add --dev gulp-postcss
	yarn add --dev gulp-rename
	yarn add --dev gulp-sass
	yarn add --dev gulp-svgmin
	yarn add --dev gulp-terser
	yarn add --dev jshint
	yarn add --dev jshint-stylish
	yarn add --dev lazypipe
  yarn add --dev node-sass
  yarn add --dev postcss
fi

if ((1)); then
  # run som gulp tasks
	yarn gulp
	yarn gulp --tasks
	yarn gulp --tasks-simple
fi

if ((1)); then
  # more requirements for gulpfile.js
  yarn add --dev mkdirp
  yarn add --dev rimraf
  yarn add --dev unzipper
fi

if ((1)); then
  # some common packages as project requirements
  yarn add @fortawesome/fontawesome-free
  yarn add jquery
  yarn add js-cookie
  yarn add responsive-tabs
  yarn add slick-carousel
  yarn add smartmenus
fi

if ((1)); then
  # fetch project packages from Yarn2
	yarn gulp --tasks-simple
fi



