'use strict'

const gulp = require('gulp')
const watch = require('gulp-watch')
const stylus = require('gulp-stylus')
const jetpack = require('fs-jetpack')
const util = require('gulp-util')

const nib = require('nib')
const jeet = require('jeet')
const rupture = require('rupture')

const srcDir = jetpack.cwd('./libs/styl')
const destDir = jetpack.cwd('./libs/public/css')

gulp.task('stylus', () => {
	watch(srcDir.path('**/*.styl'), () => { gulp.start('stylusmain') })
})

gulp.task('stylusmain', () => {
	return gulp.src(srcDir.path('app.styl'))
		.pipe(stylus({
			use: [jeet(), nib(), rupture()]
		}))
	 .pipe(gulp.dest(destDir.path()))
})
