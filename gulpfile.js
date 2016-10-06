const gulp    = require('gulp');
const path    = require('path');
const webpack = require('webpack');

const OUTPUT_PATH = path.join(__dirname, 'dist');

function handleWebpackResult(done) {
    return function(err, stats) {
        if (err) {
            console.log('Error', err);
        } else {
            console.log(`\n${stats.toString()}\n`);
        }
        if (done) {
            done(err);
        }
    }
}

//------------------------------------------------
// Backend
//------------------------------------------------

const fs      = require('fs');
const nodemon = require('nodemon');

const node_modules = fs.readdirSync('node_modules').filter(x => x !== '.bin');

const backendConfig = (debug) => {
    return {
        debug: debug,
        entry: './backend/main.js',
        target: 'node',
        node: {
            __filename: false,
            __dirname: false
        },
        output: {
            path: OUTPUT_PATH,
            filename: 'backend.js'
        },
        externals: [
            function(context, request, callback) {
                var pathStart = request.split('/')[0];
                if (node_modules.indexOf(pathStart) >= 0 && request !== 'webpack/hot/signal.js') {
                    return callback(null, "commonjs " + request);
                };
                return callback();
            }
        ],
        module: {
            preLoaders: [{
                test: /\.js$/,
                loader: 'eslint',
                exclude: /node_modules/,
                query: {
                    failOnWarning: true,
                    failOnError: true
                }
            }],
            loaders: [{
                test: /\.js$/,
                loader: 'babel',
                query: {
                    presets: ['es2015', 'stage-0']
                }
            }]
        },
        recordsPath: path.join(__dirname, '.build/_records'),
        plugins: [
            new webpack.BannerPlugin('require("source-map-support").install();',
                                     { raw: true, entryOnly: false })
        ],
        devtool: 'source-map'
    };
};

gulp.task('build-backend', function(done) {
    webpack(backendConfig(false)).run(handleWebpackResult(done));
});

gulp.task('watch-backend', function(done) {
    var first = true;
    const output_file = path.join(OUTPUT_PATH, 'backend.js')
    webpack(backendConfig(true)).watch(100, handleWebpackResult(function() {
        if (first) {
            first = false;
            nodemon({
                execMap: {
                    js: 'node'
                },
                script: output_file,
                ignore: ['*'],
                watch: [output_file],
                ext: 'noop'
            }).on('restart', function() {
                console.log('------------------------');
                console.log('=== Server restarted ===');
                console.log('------------------------');
            });
        } else {
            nodemon.restart();
        }
    }));
});

//------------------------------------------------
// Frontend
//------------------------------------------------

const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');

const frontendConfig = (debug) => {
    return {
        debug: debug,
        entry: {
            app: ['./frontend/index.jsx'],
            style: ['./frontend/styles/app.scss']
        },
        resolve: {
            extensions: ['', '.js', '.jsx']
        },
        output: {
            path: path.join(OUTPUT_PATH, 'static'),
            publicPath: '/static/',
            filename: '[name]-[hash].min.js'
        },
        module: {
            preLoaders: [{
                test: /\.jsx?$/,
                loader: 'eslint',
                exclude: /node_modules/,
                query: {
                    failOnWarning: true,
                    failOnError: true
                }
            }],
            loaders: [
                {
                    test: /\.jsx?$/,
                    loader: 'babel',
                    exclude: /^node_modules/,
                    query: {
                        presets: ['es2015', 'stage-0', 'react'],
                        compact: false,
                        plugins: [
                            'transform-react-jsx-img-import'
                        ]
                    }
                },
                {
                    test: /\.scss$/,
                    loaders: ['style', 'css', 'sass']
                },
                {
                    test: /\.css$/,
                    loaders: ['style', 'css']
                },
                {
                    test: /\.(eot|svg|ttf|woff|woff2|ico|png|jpg|jpeg)$/,
                    loader: 'file'
                },
                {
                    test: /\.json$/,
                    loader: 'json'
                }
            ]
        },
        plugins: [
            new HtmlWebpackPlugin({
                title: 'Warehaus',
                inject: false,
                template: require('html-webpack-template'),
                appMountId: 'app'
            })
        ].concat(
            debug ? [] : [
                new FaviconsWebpackPlugin('./frontend/images/logo-favicon.svg'),
                new webpack.optimize.UglifyJsPlugin({
                    compress: {
                        warnings: false
                    }
                })
            ]
        ),
        devtool: debug ? undefined : 'source-map'
    };
};

gulp.task('build-frontend', function(done) {
    webpack(frontendConfig(false)).run(handleWebpackResult(done));
});

gulp.task('watch-frontend', function(done) {
    webpack(frontendConfig(true)).watch(100, handleWebpackResult());
});

//------------------------------------------------
// Tasks
//------------------------------------------------

gulp.task('build', ['build-backend', 'build-frontend']);
gulp.task('start', ['watch-backend', 'watch-frontend']);
