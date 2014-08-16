#!/usr/bin/env node

process.argv.splice(1, 1);

var fname = process.argv[1];
require('../lib/compiler').compile(fname, {}, function(err, code) {
    if (err) {
        throw err;
    }
    require('vm').runInThisContext(code, fname);
});
