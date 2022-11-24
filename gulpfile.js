const { src, dest, parallel, series, watch } = require('gulp');
const browserSync = require('browser-sync').create();
const concat = require('gulp-concat');
const del = require("del");
const rename = require("gulp-rename");
const plumber = require("gulp-plumber");
const sourcemap = require("gulp-sourcemaps");

const sass = require('gulp-sass')(require('sass'));
const groupMedia = require('gulp-group-css-media-queries');
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const csso = require("postcss-csso");

const fileinclude = require('gulp-file-include');
const htmlmin = require("gulp-htmlmin");

const imagemin = require("gulp-imagemin");
const webp = require("gulp-webp");
const svgstore = require("gulp-svgstore");

const uglify = require("gulp-uglify");
const webpack = require('webpack-stream');

function browsersync() {
    browserSync.init({ // Инициализация Browsersync
		server: { baseDir: 'build/' }, // Указываем папку сервера
		port: 8000,
		notify: false, // Отключаем уведомления
		online: true // Режим работы: true или false
	})
}

const styles = () => {
    return src("src/scss/main.scss")
        .pipe(plumber())
        .pipe(sourcemap.init())
        .pipe(sass())
        .pipe(groupMedia())
        .pipe(
            postcss([
                autoprefixer(({ overrideBrowserslist: ['last 10 versions'], grid: true })),
                csso()
            ])
        )
        .pipe(rename("style.min.css"))
        .pipe(sourcemap.write("."))
        .pipe(dest("build/css/"))
        .pipe(browserSync.stream());
}

exports.styles = styles;

// HTML

const html = () => {
    return src("src/index.html")
        .pipe(plumber())
        .pipe(fileinclude())
        .pipe(htmlmin({ collapseWhitespace: true }))
        .pipe(dest("build/"))
        .pipe(browserSync.stream());
}

// Scripts

const scripts = () => {
    return src([
		'src/js/app.js', 
	])
        .pipe(plumber())
		.pipe(webpack({
			mode: 'development',
		}))
		.pipe(rename('app.min.js')) // Конкатенируем в один файл
		.pipe(uglify()) // Сжимаем JavaScript
		.pipe(dest('build/js/')) // Выгружаем готовый файл в папку назначения
		.pipe(browserSync.stream()) // Триггерим Browsersync для обновления страницы
}

exports.scripts = scripts;

// imagess

const images = () => {
    return src("src/images/**/*.{png,jpg,svg}")
        .pipe(imagemin([
            imagemin.mozjpeg({ progressive: true }),
            imagemin.optipng({ optimizationLevel: 3 }),
            imagemin.svgo()
        ]))
        .pipe(dest("build/images/"))
}

exports.images = images;

// WebP

const createWebp = () => {
    return src("src/images/**/*.{jpg,png}")
        .pipe(webp({ quality: 90 }))
        .pipe(dest("build/images/webp/"))
}

exports.createWebp = createWebp;

// Sprite

const sprite = () => {
    return src("src/images/icons/*.svg")
        .pipe(svgstore())
        .pipe(rename("sprite.svg"))
        .pipe(dest("build/images/sprite/"));
}

exports.sprite = sprite;

// Copy

const copy = () => {
    return src([
        "src/fonts/*.{woff2,woff}",
        "src/*.ico",
        "src/images/**/*.{jpg,png,svg}",
    ], {
        base: "src"
    })
        .pipe(dest("build/"))
        .pipe(browserSync.stream());
}

exports.copy = copy;

// Copy only images 

const copyDevImages = () => {
    return src([
        "src/images/**/*.{jpg,png,svg}"
    ])
        .pipe(dest("build/images/"))
        .pipe(browserSync.stream());
}

exports.copyDevImages = copyDevImages;

// Clean

const cleanDevImages = () => {
    return del("build/images/**/*")
}

const cleanBuild = () => {
    return del('build/')
}

// Watcher

function startwatch() {

    // Выбираем все файлы JS в проекте, а затем исключим с суффиксом .min.js
    watch('src/**/*.js', scripts);

    // Мониторим файлы препроцессора на изменения
    watch('src/scss/**/*', styles);

    // Мониторим файлы HTML на изменения
    watch('src/**/*.html', html);
    watch('src/**/*.html').on('change', browserSync.reload);

    // Мониторим папку-источник изображений и выполняем images(), если есть изменения
    watch('src/images/**/*', series(cleanDevImages, copyDevImages, html));

}



// Build
const build = series(cleanBuild, parallel( styles, html, scripts, sprite, series(copy, images, createWebp) ) );
exports.build = build;

// Default
exports.default = series(cleanBuild, parallel(styles, html, scripts, sprite, copy, browsersync, startwatch));
