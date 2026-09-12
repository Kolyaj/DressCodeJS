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
// сталкиваются с временными файлами других процессов.
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

program
    .version(version)
    .requiredOption('-i, --input <path>', 'input file')
    .option('-o, --output <path>', 'output file, if not specified it will be stdout')
    .option('-d, --debug', 'don\'t obfuscate private names, also it add parameter --set debug')
    .option('--set <flag>', 'one or more flags for set directive', collectObject, {})
    .option('--layer <layer>', 'build only code under this layer, don\'t use with --layers option')
    .option('--layers <layer>', 'one or more layers that will be included to output, dot\'t use with --layer option', collectArray, [])
    .option('--private-dict <path>', 'path to storage json-file for private names')
    .option('--fail-on-errors', 'exit process if build error occured, by default it output new Error() expression');

var args = program.parse(process.argv);
if (args.layer && args.layers.length > 0) {
    console.log('Don\'t use layer and layers options together.');
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
        return dresscode.compile(args.input, args.set, [], args.layer || args.layers).then((result) => {
            if (args.output) {
                return fs.outputFile(args.output, result);
            } else {
                console.log(result);
            }
        });
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
