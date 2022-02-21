/* eslint-disable */
'use strict';

// Генератор файлов блока

// Использование: node createBlock.js [имя блока] [доп. расширения через пробел]

const fs = require('fs');
const projectConfig = require('./config.js');

const dir = projectConfig.dir;
const mkdirp = require('mkdirp');

const blockName = process.argv[2];
const defaultExtensions = ['sass']; // расширения по умолчанию
// const defaultExtensions = ['scss', 'img']; // расширения по умолчанию
const extensions = uniqueArray(defaultExtensions.concat(process.argv.slice(3)));

// Если есть имя блока
if (blockName) {
  const dirPath = `${dir.blocks}${blockName}/`; // полный путь к создаваемой папке блока

  const made = mkdirp.sync(dirPath);
  console.log(`[NTH] Создание папки: ${made}`);

  // Обходим массив расширений и создаем файлы, если они еще не созданы
  extensions.forEach((extension) => {
    const filePath = `${dirPath + blockName}.${extension}`; // полный путь к создаваемому файлу
    let fileContent = '';                                   // будущий контент файла
    let fileCreateMsg = '';                                 // будущее сообщение в консоли при создании файла

    if (extension === 'sass') {
      fileContent = `.${blockName}\n  `;
      // fileCreateMsg = '';
    }

    else if (extension === 'js') {
      fileContent = `/* global document */\n\n// import ready from 'Utils/documentReady.js';\n\n// ready(function() {\n//   \n// });\n`;
    }

    else if (extension === 'md') {
      fileContent = '';
    }

    else if (extension === 'pug') {
      fileContent = `mixin ${blockName}()\n\n  +b.SECTION.${blockName}\n    .container\n      \n`;
    }

    else if (extension === 'img') {
      const imgFolder = `${dirPath}img/`;
      if (fileExist(imgFolder) === false) {
        const made = mkdirp.sync(imgFolder);
        console.log(`[NTH] Создание папки: ${made}`);
      } else {
        console.log(`[NTH] Папка ${imgFolder} НЕ создана (уже существует) `);
      }
    }

    if (fileExist(filePath) === false && extension !== 'img' && extension !== 'md') {
      fs.writeFile(filePath, fileContent, (err) => {
        if (err) {
          return console.log(`[NTH] Файл НЕ создан: ${err}`);
        }
        console.log(`[NTH] Файл создан: ${filePath}`);
        if (fileCreateMsg) {
          console.warn(fileCreateMsg);
        }
      });
    }
    else if (extension !== 'img' && extension !== 'md') {
      console.log(`[NTH] Файл НЕ создан: ${filePath} (уже существует)`);
    }
    else if (extension === 'md') {
      fs.writeFile(`${dirPath}readme.md`, fileContent, (err) => {
        if (err) {
          return console.log(`[NTH] Файл НЕ создан: ${err}`);
        }
        console.log(`[NTH] Файл создан: ${dirPath}readme.md`);
        if (fileCreateMsg) {
          console.warn(fileCreateMsg);
        }
      });
    }
  });
} else {
  console.log('[NTH] Отмена операции: не указан блок');
}


function uniqueArray(arr) {
  const objectTemp = {};
  for (let i = 0; i < arr.length; i++) {
    const str = arr[i];
    objectTemp[str] = true;
  }
  return Object.keys(objectTemp);
}

function fileExist(path) {
  const fs = require('fs');
  try {
    fs.statSync(path);
  } catch (err) {
    return !(err && err.code === 'ENOENT');
  }
}
