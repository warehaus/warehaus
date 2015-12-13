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
    pages:     'src/templates/pages',
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

gulp.task('pages', function() {
    gulp.src([dirs.pages + '/**/*.jade',
              '!' + dirs.pages + '/base/**/*'])
        .pipe(jade())
        .pipe(gulp.dest('../static/pages'))
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

gulp.task('default', ['scripts', 'styles', 'pages', 'partials', 'resources'], function() {
    gulp.watch([dirs.scripts + '/**'], ['scripts']);
    gulp.watch([dirs.styles + '/**'], ['styles']);
    gulp.watch([dirs.pages + '/**'], ['pages']);
    gulp.watch([dirs.partials + '/**'], ['partials']);
    gulp.watch([dirs.resources + '/**'], ['resources']);
});

gulp.task('build', ['scripts', 'styles', 'templates', 'resources']);
