var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sass = require('gulp-sass');
var minifyCSS = require('gulp-minify-css');
var jade = require('gulp-jade');

var dirs = {
    scripts: 'src/scripts',
    styles: 'src/styles',
    templates: 'src/templates',
    resources: 'resources',
};

gulp.task('scripts', function() {
    gulp.src([dirs.scripts + '/**/*.module.js',
              dirs.scripts + '/**/*.js'])
        .pipe(concat('labsome.js'))
        .pipe(uglify())
        .pipe(gulp.dest('../static'))
    ;
});

gulp.task('styles', function() {
    gulp.src([dirs.styles + '/labsome.scss'])
        .pipe(sass())
        .pipe(minifyCSS())
        .pipe(gulp.dest('../static'))
    ;
});

gulp.task('templates', function() {
    gulp.src([dirs.templates + '/**/*.jade',
              '!' + dirs.templates + '/partials/**/*'])
        .pipe(jade())
        .pipe(gulp.dest('../static/templates'))
    ;
});

gulp.task('resources', function() {
    gulp.src([dirs.resources + '/**'])
        .pipe(gulp.dest('../static'))
});

gulp.task('default', ['scripts', 'styles', 'templates', 'resources'], function() {
    gulp.watch([dirs.scripts + '/**'], ['scripts']);
    gulp.watch([dirs.styles + '/**'], ['styles']);
    gulp.watch([dirs.templates + '/**'], ['templates']);
    gulp.watch([dirs.resources + '/**'], ['resources']);
});

gulp.task('build', ['scripts', 'styles', 'templates', 'resources']);
