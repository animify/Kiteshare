'use strict'

const gulp = require('gulp')
const watch = require('gulp-watch')
const nodemon = require('gulp-nodemon')
const jetpack = require('fs-jetpack')

gulp.task('start', ['stylusmain', 'stylus'], function () {
	nodemon({
		script: 'server.js'
	, ext: 'js html'
	, env: { 'NODE_ENV': 'development' }
	})
})
