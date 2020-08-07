#!/usr/bin/env node

var fs = require('fs-extra');
var {DressCode} = require('../lib/DressCode');
var {program} = require('commander');
var {version} = require('../package');

var collectArray = function(value, prev) {
    return prev.concat([value]);
};

var collectObject = function(value, prev) {
    return {[value]: true, ...prev};
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
    process.exit(1);
}
if (args.debug) {
    args.set.debug = true;
}

var output = args.output ? fs.createWriteStream(args.output, 'utf8') : process.stdout;
var dresscode = new DressCode(args.debug, args.failOnErrors);
Promise.resolve().then(() => {
    if (args.privateDict) {
        return fs.readJson(args.privateDict).then((dict) => {
            dresscode.setPrivateNamesDict(dict);
        });
    }
}).then(() => {
    return dresscode.compile(args.input, args.set, [], args.layer || args.layers).then((result) => {
        output.write(result);
        if (output !== process.stdout) {
            output.end();
        }
    });
}).then(() => {
    if (args.privateDict) {
        return fs.writeJson(args.privateDict, dresscode.getPrivateNamesDict());
    }
}).catch((err) => {
    console.error(err.stack);
    if (args.output) {
        output.end();
    }
    process.exit(1);
});
