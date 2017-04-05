'use strict'

const gulp = require('gulp')
const watch = require('gulp-watch')
const runElectron = require('gulp-run-electron')
const jetpack = require('fs-jetpack')

const srcDir = jetpack.cwd('./app')

const electron = require('electron-connect').server.create({path: "app"})

gulp.task('serve', function () {

	electron.start()

	gulp.watch(srcDir.path('**/*.js'), electron.restart)

	gulp.watch(srcDir.path('**/*.html'), electron.reload)
})

gulp.task("default", ["serve", "stylus", "stylusmain"])
