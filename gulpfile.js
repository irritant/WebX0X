var gulp = require('gulp');
var order = require('gulp-order');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var minifycss = require('gulp-minify-css');
var notify = require('gulp-notify');

/******** PATHS ********/

var paths = {
    js: [
        'resources/vendor/fastclick/lib/fastclick.js',
        'resources/js/web-worker-factory.js',
        'resources/js/web-sequence.js',
        'resources/js/web-ahdsr.js',
        'resources/js/web-noise.js',
        'resources/js/web-drum.js',
        'resources/js/web-synth-ui.js',
        'resources/js/web-drum-machine.js'
    ],
    worker: [
        'resources/js/web-sequence-worker.js'
    ],
    css: [
        'resources/css/web-synth-ui.css',
        'resources/css/web-drum-machine.css'
    ]
}

/******** TASKS ********/

gulp.task('js', function() {
    return gulp.src(paths.js)
        .pipe(order(paths.js, {base: '.'}))
        .pipe(concat('scripts.js'))
        .pipe(gulp.dest('resources/dist'))
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('resources/dist'))
        .pipe(notify('Completed task: js'));
});

gulp.task('worker', function() {
    return gulp.src(paths.worker)
        .pipe(order(paths.worker, {base: '.'}))
        .pipe(concat('worker.js'))
        .pipe(gulp.dest('resources/dist'))
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('resources/dist'))
        .pipe(notify('Completed task: worker'));
});

gulp.task('css', function() {
    return gulp.src(paths.css)
        .pipe(order(paths.css, {base: '.'}))
        .pipe(concat('styles.css'))
        .pipe(gulp.dest('resources/dist'))
        .pipe(minifycss())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('resources/dist'))
        .pipe(notify('Completed task: css'));
});

/******** DEFAULT TASK ********/

gulp.task('default', ['js', 'worker', 'css']);

/******** WATCH ********/

gulp.task('watch', function() {
    gulp.watch(paths.js, ['js']);
    gulp.watch(paths.js, ['worker']);
    gulp.watch(paths.css, ['css']);
});