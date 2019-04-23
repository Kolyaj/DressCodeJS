#!/usr/bin/env node

var fs = require('fs-extra');
var {DressCode} = require('../lib/DressCode');

var context = {};
var args = [];
var params = {
    'private-dict': ''
};
process.argv.slice(2).forEach((arg) => {
    if (arg.match(/^--(.+?)=(.*)$/)) {
        params[RegExp.$1] = RegExp.$2;
    } else if (arg.indexOf('-') === 0) {
        context[arg.substr(1)] = true;
    } else {
        args.push(arg);
    }
});

if (!args[0]) {
    console.log('Usage: dresscodejs <input file> <output file> [--private-dict=path/to/dict.json] -context_var1 -context_var2 ...');
    process.exit(1);
}

var dresscode = new DressCode(context.debug);
Promise.resolve().then(() => {
    if (params['private-dict']) {
        return fs.readJson(params['private-dict']).then((dict) => {
            dresscode.setPrivateNamesDict(dict);
        });
    }
}).then(() => {
    return dresscode.compile(args[0], context).then((result) => {
        if (args[1]) {
            return fs.ensureFile(args[1], result, 'utf8');
        } else {
            console.log(result);
        }
    });
}).then(() => {
    if (params['private-dict']) {
        return fs.writeJson(params['private-dict'], dresscode.getPrivateNamesDict());
    }
}).catch((err) => {
    console.error(err.stack);
    process.exit(1);
});
