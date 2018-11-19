var assert = require('assert');
var mock = require('mock-fs');
var fs = require('fs');
var {promisify} = require('util');
var {DressCode} = require('../lib/DressCode');
var path = require('path');

var readFile = promisify(fs.readFile);

var readTest = async(testFileName) => {
    var files = {};
    var input;
    var output;
    var currentFileContent;
    var testContent = await readFile(path.join(__dirname, 'tests', testFileName), 'utf8');
    testContent.split('\n').forEach((line) => {
        if (line.indexOf('//===') === 0) {
            var fname = line.substr(5).trim();
            currentFileContent = [];
            if (fname) {
                if (!input) {
                    input = fname;
                }
                files[fname] = currentFileContent;
            } else {
                output = currentFileContent;
            }
        } else {
            if (currentFileContent) {
                currentFileContent.push(line.indexOf('//:') === 0 ? line.substr(3).trim() : line, '\n');
            } else {
                throw new Error(`Unexpected file content in ${testFileName}`)
            }
        }
    });
    Object.keys(files).forEach((fname) => {
        files[fname] = files[fname].join('').trim();
    });
    if (!input) {
        throw new Error(`No file found in ${testFileName}`);
    }
    if (!output) {
        throw new Error(`Output not found in ${testFileName}`);
    }
    return {
        files: files,
        input: input,
        output: output.join('').trim()
    };
};

describe('Dresscode', () => {
    afterEach(() => {
        mock.restore();
    });

    it('Находим файл .dresscode в текущей директории', async() => {
        mock({
            '/foo/.dresscode': 'a'
        });
        assert.deepEqual(await new DressCode().getDresscodeFileContent('/foo'), ['/foo/a']);
    });

    it('Абсолютные пути в файле .dresscode', async() => {
        mock({
            '/foo/.dresscode': '/a'
        });
        assert.deepEqual(await new DressCode().getDresscodeFileContent('/foo'), ['/a']);
    });

    it('Находим файл .dresscode в вышележащей директории', async() => {
        mock({
            '/foo': {
                '.dresscode': './a',
                'bar': {
                    'baz': {}
                }
            }
        });
        assert.deepEqual(await new DressCode().getDresscodeFileContent('/foo/bar/baz'), ['/foo/a'])
    });

    it('Найденный файл .dresscode кешируется', async() => {
        mock({
            '/foo': {
                '.dresscode': './a',
                'bar': {
                    'baz': {}
                }
            }
        });
        var dresscode = new DressCode();
        await dresscode.getDresscodeFileContent('/foo/bar/baz');
        mock.restore();
        mock({
            '/foo': {
                '.dresscode': './b',
                'bar': {
                    'baz': {}
                }
            }
        });
        assert.deepEqual(await dresscode.getDresscodeFileContent('/foo/bar/baz'), ['/foo/a']);
        assert.deepEqual(await dresscode.getDresscodeFileContent('/foo/bar'), ['/foo/a']);
        assert.deepEqual(await dresscode.getDresscodeFileContent('/foo'), ['/foo/a']);
    });

    it('Если файл .dresscode не нашёлся, то возвращается пустой массив', async() => {
        mock({
            '/foo/bar/baz': {}
        });
        assert.deepEqual(await new DressCode().getDresscodeFileContent('/foo/bar/baz'), []);
    });

    it('Строим плоский список компонентов в директории', async() => {
        mock({
            '/foo/Foo': {
                'index.js': '',
                'Foo.js': ''
            }
        });
        assert.deepEqual(await new DressCode().getComponentsInDir('/foo'), [
            {cname: 'Foo', fname: '/foo/Foo/index.js', indexfile: null},
            {cname: 'Foo.Foo', fname: '/foo/Foo/Foo.js', indexfile: 'index.js'}
        ]);
    });

    it('Файлы в корневой директории библиотеки в список не попадают', async() => {
        mock({
            '/foo': {
                'Foo': {
                    'index.js': ''
                },
                'bar.js': ''
            }
        });
        assert.deepEqual(await new DressCode().getComponentsInDir('/foo'), [
            {cname: 'Foo', fname: '/foo/Foo/index.js', indexfile: null},
        ]);
    });

    it('Файлы с маленькой буквы в список не попадают', async() => {
        mock({
            '/foo/Foo': {
                'index.js': '',
                'bar.js': ''
            }
        });
        assert.deepEqual(await new DressCode().getComponentsInDir('/foo'), [
            {cname: 'Foo', fname: '/foo/Foo/index.js', indexfile: null},
        ]);
    });

    describe('Корректность сборки', () => {
        fs.readdirSync(path.join(__dirname, 'tests')).forEach((fname) => {
            if (/\.js$/.test(fname)) {
                it(fname.substr(0, fname.length - 3), async() => {
                    var test = await readTest(fname);
                    mock(test.files);
                    var result = await new DressCode(true).compile(test.input);
                    assert.equal(result.trim(), test.output.trim());
                });
            }
        });
    });
});
