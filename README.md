#Boilerplate It's easy Gulp + Pug + SASS Smartgrid boilerplate

##Quick start

* Install dev-dependencies `yarn install`
* Launch `gulp` to run watchers, server and compilers
* Launch `gulp build` to minify files for production
* Launch `gulp webp` to convert .png files to .webp
* Launch `node createBlock.js block-name pug` to create block files

##Directory Layout

	interact                    # Project root
	├── /app/                   # Compiled files for developing (Скомпилированные файлы для разработки)
	├── /build/                 # Minified files for production (Минифицированные файлы для продакшна)
	├── package.json            # Dependencies for node.js
	├── gulpfile.js             # gulp.js config
	├── helpers.sass            # helpers.sass config
	├── smartgrid.js            # smartgrid.js config
	├── README.md               # File you read
