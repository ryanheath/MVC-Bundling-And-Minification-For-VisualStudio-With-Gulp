/// <binding BeforeBuild='default' AfterBuild='bundles-clean-artefacts' Clean='bundles-clean, bundles-clean-artefacts' ProjectOpened='watch-less-files' />
var gulp = require('gulp');
var bower = require('gulp-bower');

var less = require('gulp-less');
var concat = require('gulp-concat');

var rename = require('gulp-rename');
var minifycss = require('gulp-minify-css');
var minifyjs = require('gulp-uglify');

var revision = require('gulp-rev');
var del = require('del');

var fs = require('fs');

gulp.task('bower', function () {
    return bower({ layout: "byComponent" });
});

var paths = {
    app: "./Content/",
    bundle_source: "./App_Start/",
    bundle_target: "./static_b/",
    bundle_views_target: "./Views/Shared/Bundles/"
}

gulp.task('less-to-css', function () {
    return gulp.src([paths.app + "**/*.less"])
        .pipe(less({ paths: [paths.app, paths.lib] }))
        .pipe(gulp.dest(paths.app));
});

gulp.task('watch-less-files', function() {
    return gulp.watch(paths.app + "**/*.less", ['less-to-css']);
});

function loadJson(filename) {
    var json = fs.readFileSync(filename, 'utf8');
    if (json.charCodeAt(0) === 65279) { // utf bom
        json = json.substring(1);
    }
    var obj = JSON.parse(json);
    return obj;
}

var bundles_create_js_tasks = [];
var bundles_create_css_tasks = [];

(function createBundleTasks() {

    function createTaskFromBundle(includes, taskName, target, bundle) {
        gulp.task(taskName, function () {
            var sources = [];
            if (bundle.includes) {
                for (var key in bundle.includes) {
                    if (!bundle.includes.hasOwnProperty(key)) {
                        continue;
                    }
                    var includeKey = bundle.includes[key];
                    var include = includes[includeKey];
                    if (include) {
                        sources = sources.concat(include);
                    } else {
                        throw 'Include "' + includeKey + '" not found for ' + taskName;
                    }
                }
            }
            sources = sources.concat(bundle.sources);
            return gulp.src(sources)
                .pipe(concat(target))
                .pipe(gulp.dest(paths.bundle_target));
        });
    }

    function createTaskFromBundles(tasks, jsonFilename, bundleType) {
        var bundlesJson = loadJson(paths.bundle_source + jsonFilename);
        var bundles = bundlesJson.bundles;
        var includes = bundlesJson.includes;

        for (var key in bundles) {
            if (!bundles.hasOwnProperty(key)) {
                continue;
            }
            var bundle = bundles[key];
            var taskName = 'zbundles-create-' + bundleType + '-' + key;
            var target = bundleType + '/' + key;

            createTaskFromBundle(includes, taskName, target, bundle);

            tasks.push(taskName);
        }
    }

    createTaskFromBundles(bundles_create_js_tasks, 'bundles-js.json', 'js');
    createTaskFromBundles(bundles_create_css_tasks, 'bundles-css.json', 'css');
})();

gulp.task('bundles-create-js', bundles_create_js_tasks);
gulp.task('bundles-create-css', bundles_create_css_tasks);
gulp.task('bundles-create', ['bundles-create-js', 'bundles-create-css']);

gulp.task('bundles-clean', function () {
    return del([
        paths.bundle_target + 'js/*.js',
        paths.bundle_target + 'css/*.css'
    ]);
});

gulp.task('bundles-minify-js', ['bundles-create-js'], function () {
    return gulp.src([paths.bundle_target + 'js/*.js', '!**/*.min.js'])
        .pipe(minifyjs())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(paths.bundle_target + 'js'));
});

gulp.task('bundles-minify-css', ['bundles-create-css'], function () {
    return gulp.src([paths.bundle_target + 'css/*.css', '!**/*.min.css'])
        .pipe(minifycss())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(paths.bundle_target + 'css'));
});

gulp.task('bundles-minify', ['bundles-minify-js', 'bundles-minify-css']);


gulp.task('bundles-revision-js', ['bundles-minify-js'], function () {
    return gulp.src([paths.bundle_target + 'js/*.min.js', '!' + paths.bundle_target + 'js/*-*.min.js'])
        .pipe(revision())
        .pipe(gulp.dest(paths.bundle_target + 'js'))
        .pipe(revision.manifest('bundles-js-revision.json'))
        .pipe(gulp.dest(paths.bundle_target));
});

gulp.task('bundles-revision-css', ['bundles-minify-css'], function () {
    return gulp.src([paths.bundle_target + 'css/*.min.css', '!' + paths.bundle_target + 'css/*-*.min.css'])
        .pipe(revision())
        .pipe(gulp.dest(paths.bundle_target + 'css'))
        .pipe(revision.manifest('bundles-css-revision.json'))
        .pipe(gulp.dest(paths.bundle_target));
});

gulp.task('bundles-revision', ['bundles-revision-js', 'bundles-revision-css']);

function createCshtmlBundles(fileType, scriptIncludeCallback) {
    var bundlesJson = loadJson(paths.bundle_source + 'bundles-' + fileType + '.json');
    
    function getMinifiedFile(key) {
        var bundlesRevisionJson = loadJson(paths.bundle_target + 'bundles-' + fileType + '-revision.json');
        var minKey = key.replace('.' + fileType, '.min.' + fileType);
        var revisionKey = bundlesRevisionJson[minKey];
        if (!revisionKey) {
            throw 'Revision "' + minKey + '" not found';
        }
        var minScript = paths.bundle_target + fileType + '/' + revisionKey;
        return minScript.substr(1);
    }

    function writeScriptIncludes(file, scripts) {
        for (var fileKey in scripts) {
            if (!scripts.hasOwnProperty(fileKey)) {
                continue;
            }
            var filename = scripts[fileKey];
            if (!fs.existsSync(scripts[fileKey])) {
                throw 'File "' + filename + '" not found';
            }
            var cssfile = "@root" + filename.substr(1);
            fs.appendFileSync(file, scriptIncludeCallback(cssfile) + '\r\n');
        }
    }

    function writeBundlesIncludes(csfile, bundle) {
        if (bundle.includes) {
            for (var key in bundle.includes) {
                if (!bundle.includes.hasOwnProperty(key)) {
                    continue;
                }
                var includeKey = bundle.includes[key];
                var includes = bundlesJson.includes[includeKey];
                if (includes) {
                    writeScriptIncludes(csfile, includes);
                } else {
                    throw 'Include "' + includeKey + '" not found';
                }
            }
        }
    }

    for (var key in bundlesJson.bundles) {
        if (!bundlesJson.bundles.hasOwnProperty(key)) {
            continue;
        }
        var bundle = bundlesJson.bundles[key];

        var csfile = paths.bundle_views_target + key + '.bundle.cshtml';
        if (!fs.existsSync(paths.bundle_views_target)) {
            fs.mkdirSync(paths.bundle_views_target);
        }

        fs.writeFileSync(csfile, '@{\r\n');
        fs.appendFileSync(csfile, '    var root = "";\r\n');
        fs.appendFileSync(csfile, '    if (ViewBag.BundlesUseAbsolutePath == true) {\r\n');
        fs.appendFileSync(csfile, '        root = HttpContext.Current.Request.Url.Scheme + "://" + HttpContext.Current.Request.Url.Authority;\r\n');
        fs.appendFileSync(csfile, '    }\r\n');
        fs.appendFileSync(csfile, '}\r\n');

        fs.appendFileSync(csfile, '@if (HttpContext.Current.IsDebuggingEnabled) {\r\n');
        writeBundlesIncludes(csfile, bundle);
        writeScriptIncludes(csfile, bundle.sources);
        fs.appendFileSync(csfile, '} else {\r\n');
        fs.appendFileSync(csfile, scriptIncludeCallback("@root" + getMinifiedFile(key)) + '\r\n');
        fs.appendFileSync(csfile, '}\r\n');
    }
}

gulp.task('bundles-create-includes-js', ['bundles-revision-js'], function() {
    
    function scriptIncludeCallback(jsfile) {
        return '<script src="' + jsfile + '"></script>';   
    }
    
    createCshtmlBundles('js', scriptIncludeCallback);
});

gulp.task('bundles-create-includes-css', ['bundles-revision-css'], function() {
    
    function scriptIncludeCallback(cssfile) {
        return '<link rel="stylesheet" type="text/css" href="' + cssfile + '">';
    }
    
    createCshtmlBundles('css', scriptIncludeCallback);
});

gulp.task('bundles-create-includes', ['bundles-create-includes-js', 'bundles-create-includes-css']);

gulp.task('bundles-clean-artefacts', function () {
    return del([
        paths.bundle_target + 'js/*.js', '!' + paths.bundle_target + 'js/*-*.min.js',
        paths.bundle_target + 'css/*.css', '!' + paths.bundle_target + 'css/*-*.min.css',
        paths.bundle_target + '*-revision.json'
    ]);
});

gulp.task('default', ['bower', 'bundles-create-includes', 'bundles-clean-artefacts']);