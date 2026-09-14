#!/usr/bin/env node

var fs = require('fs-extra');
var path = require('path');
var {DressCode} = require('../lib/DressCode');
var {program} = require('commander');
var {version} = require('../package');

var collectArray = function(value, prev) {
    return prev.concat([value]);
};

var collectObject = function(value, prev) {
    return {[value]: true, ...prev};
};

// Атомарная запись файла словаря: сначала во временный файл в том же
// каталоге, затем rename(). rename атомарен — параллельный читатель
// (другая сборка) не увидит наполовину записанный файл. pid в имени
// временного файла: остатки от упавшей сборки опознаются и не
// сталкивается с временными файлами других процессов.
var writeJsonAtomic = function(filePath, data) {
    var dirname = path.dirname(filePath);
    var tmpPath = path.join(dirname, `.${path.basename(filePath)}.${process.pid}.tmp`);
    return fs.mkdirs(dirname)
        .then(() => fs.writeJson(tmpPath, data))
        .then(() => fs.rename(tmpPath, filePath))
        .catch((err) => {
            return fs.remove(tmpPath).then(() => {
                throw err;
            });
        });
};

var statOrNull = function(p) {
    try {
        return fs.statSync(p);
    } catch (err) {
        return null;
    }
};

// Рекурсивный сбор *.js-файлов. Порядок детерминирован (сортировка на каждом
// уровне), чтобы порядок выдачи приватных имён был стабилен между сборками.
// Единственное, что пропускается, — поддерево выходного каталога (если он
// лежит внутри входного, напр. -i . -o build): при повторном запуске нельзя
// пересобирать собственные же результаты.
var collectJsFiles = function(dir, skipDir, list) {
    list = list || [];
    fs.readdirSync(dir).sort().forEach((item) => {
        var fullname = path.join(dir, item);
        var itemStat = fs.statSync(fullname);
        if (itemStat.isDirectory()) {
            if (skipDir !== null && (fullname === skipDir || fullname.indexOf(skipDir + path.sep) === 0)) {
                return;
            }
            collectJsFiles(fullname, skipDir, list);
        } else if (itemStat.isFile() && /\.js$/.test(item)) {
            list.push(fullname);
        }
    });
    return list;
};

// Сборка папки: каждый собранный файл получает собственный выходной файл в
// outputDir с сохранением структуры. Один экземпляр DressCode на всю папку:
// словарь приватных имён общий, так что одно и то же имя $$ получает одно и
// то же приватное имя во всех выходных файлах.
var compileFolder = function(dresscode, inputDir, outputDir, set, layers) {
    var files = collectJsFiles(inputDir, outputDir);
    return files.reduce((chain, file) => {
        return chain.then(() => {
            var outputPath = path.join(outputDir, path.relative(inputDir, file));
            return dresscode.compile(file, set, [], layers).then((result) => {
                return fs.outputFile(outputPath, result);
            });
        });
    }, Promise.resolve());
};

program
    .version(version)
    .requiredOption('-i, --input <path>', 'input file, or a folder: then all js files in it (recursively) are built')
    .option('-o, --output <path>', 'output file, or an output folder in folder mode (required there); if not specified it will be stdout')
    .option('-d, --debug', 'don\'t obfuscate private names, also it add parameter --set debug')
    .option('--set <flag>', 'one or more flags for set directive', collectObject, {})
    .option('--layer <layer>', 'build only code under this layer, don\'t use with --layers option')
    .option('--layers <layer>', 'one or more layers that will be included to output, dot\'t use with --layer option', collectArray, [])
    .option('--private-dict <path>', 'path to storage json-file for private names')
    .option('--fail-on-errors', 'exit process if build error occured, by default it output new Error() expression');

var args = program.parse(process.argv);

var inputPath = path.resolve(args.input);
var inputStat = statOrNull(inputPath);
var isFolder = inputStat !== null && inputStat.isDirectory();
var outputDir = null;

var usageError = null;
if (args.layer && args.layers.length > 0) {
    usageError = 'Don\'t use layer and layers options together.';
} else if (isFolder && !args.output) {
    usageError = 'In folder mode (-i is a folder) the -o option with an output folder is required.';
} else if (isFolder) {
    outputDir = path.resolve(args.output);
    if (outputDir === inputPath) {
        usageError = 'The output folder must not be the same as the input folder: that would rebuild the sources in place.';
    } else {
        var outputStat = statOrNull(outputDir);
        if (outputStat !== null && !outputStat.isDirectory()) {
            usageError = `The output path ${args.output} exists but is not a folder; in folder mode -o must be a folder.`;
        }
    }
}

if (usageError) {
    console.error(usageError);
    // exitCode instead of process.exit(): the process exits naturally when the event
    // loop drains, so the buffered stdout write above is not lost through a pipe.
    process.exitCode = 1;
} else {
    if (args.debug) {
        args.set.debug = true;
    }

    var dresscode = new DressCode(args.debug, args.failOnErrors);
    var dictBefore = null; // словарь, как прочитан с диска: чтобы не переписывать без изменений
    Promise.resolve().then(() => {
        if (args.privateDict) {
            return fs.pathExists(args.privateDict).then((dictExists) => {
                if (dictExists) {
                    return fs.readJson(args.privateDict).then((dict) => {
                        if (!Array.isArray(dict)) {
                            throw new Error(`Private names dictionary ${args.privateDict} should contain a JSON array.`);
                        }
                        dictBefore = dict;
                        dresscode.setPrivateNamesDict(dict);
                    });
                }
            });
        }
    }).then(() => {
        var layers = args.layer || args.layers;
        if (isFolder) {
            return compileFolder(dresscode, inputPath, outputDir, args.set, layers);
        } else {
            return dresscode.compile(inputPath, args.set, [], layers).then((result) => {
                if (args.output) {
                    return fs.outputFile(args.output, result);
                } else {
                    console.log(result);
                }
            });
        }
    }).then(() => {
        if (args.privateDict) {
            var dictAfter = dresscode.getPrivateNamesDict();
            // Словарь за сборку только растёт. Если новых приватных имён не
            // появилось, файл не переписываем: при параллельных сборках на
            // общий словарь последний писавший перезаписывает предыдущего,
            // а переписка без изменений лишь обновляет mtime.
            if (dictBefore && dictAfter.length === dictBefore.length) {
                return;
            }
            return writeJsonAtomic(args.privateDict, dictAfter);
        }
    }).catch((err) => {
        console.error(err.stack);
        // exitCode instead of process.exit(): let the buffered stderr write flush
        // before the process exits — process.exit() drops unflushed pipe writes.
        process.exitCode = 1;
    });
}
