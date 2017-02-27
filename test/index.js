var assert = require('assert');
var mock = require('mock-fs');
var {DressCode} = require('../lib/DressCode');

var tests = {
    'Very simple test': {
        fs: {
            '/foo/bar.js': 'alert(1);'
        },
        input: '/foo/bar.js',
        result: 'alert(1);'
    },
    'test 1': {
        fs: {
            '/js-dev': {
                'script.js': '//#require Foo.Bar\na2();',
                '.dresscode': '../js-libs'
            },
            '/js-libs': {
                'Foo': {
                    'index.js': 'index();\n',
                    'Bar.js': 'a1();\n'
                },
                '.dresscode': '.'
            }
        },
        input: '/js-dev/script.js',
        result: 'index();\na1();\na2();'
    }
};

describe('Dresscode', () => {
    Object.keys(tests).forEach((name) => {
        var test = tests[name];
        it(name, function() {
            mock(test.fs);
            return new DressCode().compile(test.input).then((result) => {
                assert.equal(result, test.result);
                mock.restore();
            });
        });
    });
});
