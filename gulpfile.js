const { src, dest, parallel, series, watch } = require('gulp');

const browserSync   = require('browser-sync').create();
const sass          = require('gulp-sass');
const autoprefixer  = require('gulp-autoprefixer');
const cleancss      = require('gulp-clean-css');
const imagemin      = require('gulp-imagemin');
const webp          = require('gulp-webp');
const newer         = require('gulp-newer');
const del           = require('del');
const pug           = require('gulp-pug');
const plumber       = require('gulp-plumber');
const useref        = require('gulp-useref');
const uglify        = require('gulp-uglify-es').default;
const gulpif        = require('gulp-if');
const cssmin        = require('gulp-cssmin');
const smartGrid     = require('smart-grid');
const gcmq          = require('gulp-group-css-media-queries');
const path = require('path');
const fs = require('fs');

// Глобальные настройки этого запуска
// const buildLibrary = process.env.BUILD_LIBRARY || false;
const mode = process.env.MODE || 'development';
const nth = {};
nth.config = require('./config.js');
nth.blocksFromHtml = Object.create(nth.config.alwaysAddBlocks); // блоки из конфига сразу добавим в список блоков
nth.sassImportsList = []; // список импортов стилей
const dir = nth.config.dir;

// Сообщение для компилируемых файлов
let doNotEditMsg = '\n ВНИМАНИЕ! Этот файл генерируется автоматически.\n Любые изменения этого файла будут потеряны при следующей компиляции.\n Любое изменение проекта без возможности компиляции ДОЛЬШЕ И ДОРОЖЕ в 2-5 раз.\n\n';

// Прописать пути блоков в файл mixin.pug
function writePugMixinsFile(cb) {
  let allBlocksWithPugFiles = getDirectories('pug');
  let pugMixins = '//-' + doNotEditMsg.replace(/\n /gm,'\n  ');
  allBlocksWithPugFiles.forEach(function(blockName) {
    pugMixins += `include ${dir.blocks.replace(dir.src,'../')}${blockName}/${blockName}\n`;
  });
  fs.writeFileSync(`${dir.src}pug/mixins.pug`, pugMixins);
  cb();
}
exports.writePugMixinsFile = writePugMixinsFile;

// Прописать пути блоков в файл style.sass
function writeSassImportsFile(cb) {
  const newScssImportsList = [];
  nth.config.addStyleBefore.forEach(function(src) {
    newScssImportsList.push(src);
	});

  nth.config.alwaysAddBlocks.forEach(function(blockName) {
    if (fileExist(`${dir.blocks}${blockName}/${blockName}.sass`)) newScssImportsList.push(`${dir.blocks}${blockName}/${blockName}.sass`);
	});

  let allBlocksWithScssFiles = getDirectories('sass');
  allBlocksWithScssFiles.forEach(function(blockWithScssFile){
    let url = `${dir.blocks}${blockWithScssFile}/${blockWithScssFile}.sass`;
    if (nth.blocksFromHtml.indexOf(blockWithScssFile) == -1) return;
    if (newScssImportsList.indexOf(url) > -1) return;
    newScssImportsList.push(url);
	});

  nth.config.addStyleAfter.forEach(function(src) {
    newScssImportsList.push(src);
	});

  let diff = getArraysDiff(newScssImportsList, nth.sassImportsList);
  if (diff.length) {
    let msg = `\n/*!*${doNotEditMsg.replace(/\n /gm,'\n * ').replace(/\n\n$/,'\n */\n\n')}`;
    let styleImports = msg;
    newScssImportsList.forEach(function(src) {
      styleImports += `@import "${src}"\n`;
    });
    styleImports += msg;
    fs.writeFileSync(`${dir.src}sass/create-new-styles.sass`, styleImports);
    console.log('---------- Write new create-new-styles.sass');
    nth.sassImportsList = newScssImportsList;
	}

  cb();
}
exports.writeSassImportsFile = writeSassImportsFile;

/**
 * Получение всех названий поддиректорий, содержащих файл указанного расширения, совпадающий по имени с поддиректорией
 * @param  {string} ext    Расширение файлов, которое проверяется
 * @return {array}         Массив из имён блоков
 */
 function getDirectories(ext) {
  let source = dir.blocks;
  let res = fs.readdirSync(source)
    .filter(item => fs.lstatSync(source + item).isDirectory())
    .filter(item => fileExist(source + item + '/' + item + '.' + ext));
  return res;
}

// Функции, не являющиеся задачами Gulp ----------------------------------------

/**
 * Получение списка классов из HTML и запись его в глоб. переменную nth.blocksFromHtml.
 * @param  {object}   file Обрабатываемый файл
 * @param  {string}   enc  Кодировка
 * @param  {Function} cb   Коллбэк
 */
 function getClassesToBlocksList(file, enc, cb) {
  // Передана херь — выходим
  if (file.isNull()) {
    cb(null, file);
    return;
  }
  // Проверяем, не является ли обрабатываемый файл исключением
  let processThisFile = true;
  nth.config.notGetBlocks.forEach(function(item) {
    if (file.relative.trim() == item.trim()) processThisFile = false;
  });
  // Файл не исключён из обработки, погнали
  if (processThisFile) {
    const fileContent = file.contents.toString();
    let classesInFile = getClassesFromHtml(fileContent);
    // nth.blocksFromHtml = [];
    // Обойдём найденные классы
    for (let item of classesInFile) {
      // Не Блок или этот Блок уже присутствует?
      if ((item.indexOf('__') > -1) || (item.indexOf('--') > -1) || (nth.blocksFromHtml.indexOf(item) + 1)) continue;
      // Класс совпадает с классом-исключением из настроек?
      if (nth.config.ignoredBlocks.indexOf(item) + 1) continue;
      // У этого блока отсутствует папка?
      // if (!fileExist(dir.blocks + item)) continue;
      // Добавляем класс в список
      nth.blocksFromHtml.push(item);
    }
    console.log('---------- Used HTML blocks: ' + nth.blocksFromHtml.join(', '));
    file.contents = new Buffer.from(fileContent);
  }
  this.push(file);
  cb();
}

/**
 * Проверка существования файла или папки
 * @param  {string} path      Путь до файла или папки
 * @return {boolean}
 */
 function fileExist(filepath){
  let flag = true;
  try{
    fs.accessSync(filepath, fs.F_OK);
  }catch(e){
    flag = false;
  }
  return flag;
}

/**
 * Получение всех названий поддиректорий, содержащих файл указанного расширения, совпадающий по имени с поддиректорией
 * @param  {string} ext    Расширение файлов, которое проверяется
 * @return {array}         Массив из имён блоков
 */
 function getDirectories(ext) {
  let source = dir.blocks;
  let res = fs.readdirSync(source)
    .filter(item => fs.lstatSync(source + item).isDirectory())
    .filter(item => fileExist(source + item + '/' + item + '.' + ext));
  return res;
}

/**
 * Получение разницы между двумя массивами.
 * @param  {array} a1 Первый массив
 * @param  {array} a2 Второй массив
 * @return {array}    Элементы, которые отличаются
 */
 function getArraysDiff(a1, a2) {
	 return a1.filter(i => !a2.includes(i)).concat(a2.filter(i => !a1.includes(i)));
}


//-------------------- BrowserSync -------------------->
function browsersync() {
  browserSync.init({
    server: { baseDir: 'src/' },
    notify: false,
    online: true
  });
}

//-------------------- Scripts -------------------->
function scripts() {
  return src(['src/js/**/*.js', '!src/js/libs'])
  .pipe(browserSync.stream());
}

//-------------------- Pug -------------------->
function template() {
  return src(['src/pages/*.pug'])
  .pipe(plumber())
  .pipe(pug( { pretty: true } ))
  .pipe(dest('src/'))
  .pipe(browserSync.stream());
}

//-------------------- Sass -------------------->
function styles() {
  return src('src/sass/style.sass')
  .pipe(sass())
  .pipe(gcmq())
  .pipe(autoprefixer({ overrideBrowserlist: ['last 20 versions'], grid: true }))
  // .pipe(cleancss(( { level: { 1: { specialComments: 0 } } } )))
  .pipe(dest('src/css/'))
  .pipe(browserSync.stream());
}

//-------------------- Images -------------------->
function images() {
  return src(['src/img/**/*.svg', '!src/img/**/*.webp'])
    .pipe(newer('src/img/**/*'))
    .pipe(imagemin([
      imagemin.mozjpeg({ quality: 95, progressive: true }),
      imagemin.svgo({
        plugins: [
          { removeViewBox: false },
          { cleanupIDs: false }
        ]
      })
    ]))
    .pipe(dest('build/img/'));
}

function imagesWebp() {
  return src(['src/img/**/*.png', 'src/img/**/*.gif', '!src/img/**/*.webp'])
  .pipe(newer('src/img/**/*'))
  .pipe(webp({quality: 100}))
  .pipe(dest('src/img/'));
}

//-------------------- Clean Images -------------------->
function cleanPng() {
  return del('src/img/**/*.png', { force: true });
}

//-------------------- Clean Build -------------------->
function cleanbuild() {
  return del('build/**/*', { force: true });
}

//-------------------- SmartGrid -------------------->
function grid(done){
  delete require.cache[path.resolve('./smartgrid.js')];
  let options = require('./smartgrid.js');
  smartGrid('./src/sass/assets/', options);
  done();
}

function reload(done) {
  browserSync.reload();
  done();
}

//-------------------- Build Static -------------------->
function buildStatic() {
  return src([
    'src/css/*.css',
    'src/fonts/**/*',
    'src/img/**/*',
    'src/js/**/*',
    ], { base: 'src' }) //
  .pipe(dest('build'));
}

//-------------------- Build Scripts -------------------->
function buildScript() {
  return src('src/*.html')
  .pipe(useref())
  .pipe(gulpif('*.js', uglify()))
  .pipe(gulpif('*.css', cleancss()))
  .pipe(dest('build'));
}

//-------------------- Gulp Watch -------------------->
function startwatch() {
	watch(['src/pug/**/*.pug', 'src/blocks/**/*.pug', 'src/pages/*.pug'], template);
  watch(['src/sass/**/*.sass', 'src/blocks/**/*.sass', 'src/sass/**/*.scss'], styles);
  watch(['src/*.html', 'src/js/*.js']).on('change', browserSync.reload);
	watch('./smartgrid.js', grid);

	// Разметка Блоков: добавление
	watch([`${dir.blocks}**/*.pug`], { events: ['add'], delay: 100 }, series(
		writePugMixinsFile,
		template,
		reload
	));

	// Разметка Блоков: удаление
	watch([`${dir.blocks}**/*.pug`], { events: ['unlink'], delay: 100 }, writePugMixinsFile);

	// Стили Блоков: добавление
  watch([`${dir.blocks}**/*.sass`], { events: ['add'], delay: 100 }, series(
    writeSassImportsFile,
    styles
	));

}

//-------------------- Gulp Exports -------------------->
exports.browsersync   = browsersync;
exports.grid          = grid;
exports.scripts       = scripts;
exports.styles        = styles;
exports.template      = template;
exports.images        = images;
exports.imagesWebp    = imagesWebp;
exports.cleanbuild    = cleanbuild;
exports.cleanPng      = cleanPng;

exports.webp      = series(imagesWebp, cleanPng);
exports.default   = parallel(template, styles, scripts, browsersync, startwatch, writePugMixinsFile, writeSassImportsFile);
exports.build = series(cleanbuild, styles, scripts, buildStatic, buildScript, images);


