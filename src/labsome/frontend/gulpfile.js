var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var ngAnnotate = require('gulp-ng-annotate');
var sass = require('gulp-sass');
var minifyCSS = require('gulp-minify-css');
var jade = require('gulp-jade');
var templateCache = require('gulp-angular-templatecache');

var dirs = {
    scripts:   'src/scripts',
    styles:    'src/styles',
    index:     'src/templates/index.jade',
    partials:  'src/templates/partials',
    resources: 'resources',
};

gulp.task('scripts', function() {
    gulp.src([dirs.scripts + '/**/*.module.js',
              dirs.scripts + '/**/*.js'])
        .pipe(ngAnnotate())
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

gulp.task('index', function() {
    gulp.src([dirs.index])
        .pipe(jade())
        .pipe(gulp.dest('../static'))
    ;
});

gulp.task('partials', function() {
    gulp.src([dirs.partials + '/**/*.jade'])
        .pipe(jade())
        .pipe(templateCache({
            root: '/inline',
            module: 'labsome.templates',
            standalone: true
        }))
        .pipe(gulp.dest('../static'))
    ;
});

gulp.task('resources', function() {
    gulp.src([dirs.resources + '/**'])
        .pipe(gulp.dest('../static'))
});

gulp.task('default', ['scripts', 'styles', 'index', 'partials', 'resources'], function() {
    gulp.watch([dirs.scripts + '/**'], ['scripts']);
    gulp.watch([dirs.styles + '/**'], ['styles']);
    gulp.watch([dirs.index], ['index']);
    gulp.watch([dirs.partials + '/**'], ['partials']);
    gulp.watch([dirs.resources + '/**'], ['resources']);
});

gulp.task('build', ['scripts', 'styles', 'index', 'partials', 'resources']);
