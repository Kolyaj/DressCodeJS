var assert = require('assert');
var mock = require('mock-fs');
var fs = require('fs');
var fsExtra = require('fs-extra');
var os = require('os');
var {execFile} = require('child_process');
var {promisify} = require('util');
var {DressCode} = require('../lib/DressCode');
var path = require('path');

var readFile = promisify(fs.readFile);
var execFileAsync = promisify(execFile);

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

    it('clearCache сбрасывает кэши DressCode', async() => {
        mock({
            '/js-libs': {
                '.dresscode': '.',
                'Foo': {
                    'index.js': 'var Foo = {};\nFoo.bar = {};'},
                'Baz': {
                    'index.js': 'var Baz = {};\nvar x = Foo.bar;'}
            }
        });
        var dresscode = new DressCode();
        var result = await dresscode.compile('/js-libs/Baz/index.js');
        assert.ok(result.indexOf('var Foo = {};') > -1);
        mock.restore();
        mock({
            '/js-libs': {
                '.dresscode': '.',
                'Foo': {
                    'index.js': 'var Foo = {};\nFoo.bar = {};'},
                'Bar': {
                    'index.js': 'var Bar = {};\nBar.baz = {};'},
                'Baz': {
                    'index.js': 'var Baz = {};\nvar y = Bar.baz;'}
            }
        });
        dresscode.clearCache();
        assert.deepEqual(dresscode._dresscodeFilePromises, {});
        assert.deepEqual(dresscode._componentsInDirPromises, {});
        assert.deepEqual(dresscode._componentsForDirPromises, {});
        assert.deepEqual(dresscode._componentsForDir, {});
        result = await dresscode.compile('/js-libs/Baz/index.js');
        assert.ok(result.indexOf('var Bar = {};') > -1);
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

    it('Компиляция инлайн кода', async() => {
        mock({
            '/js-libs/Foo/index.js': 'var Foo = {};\nFoo.bar = {};',
            '/js-libs/.dresscode': '.',
            '/js-dev/.dresscode': '../js-libs'
        });
        var result = await new DressCode().compileCode('/js-dev/index.js', 'var Bar = Foo.bar;');
        assert.equal(result.trim(), 'var Foo = {};\nFoo.bar = {};\nvar Bar = Foo.bar;');
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

    describe('Production режим сборки', () => {
        it('$$ преобразуется во что-то короткое и одинаковое в пределах файла', async() => {
            mock({
                '/Foo/index.js': 'alert("$$");alert("$$");',
                '/.dresscode': '.'
            });
            var result = await new DressCode().compile('/Foo/index.js');
            assert.equal(result.trim(), 'alert("_0_");alert("_0_");')
        });
        it('$$ с суффиксом преобразуется во что-то короткое и одинаковое в пределах файла', async() => {
            mock({
                '/Foo/index.js': 'alert("$$");alert("$$__elem");alert("$$");alert("$$__elem");',
                '/.dresscode': '.'
            });
            var result = await new DressCode().compile('/Foo/index.js');
            assert.equal(result.trim(), 'alert("_0_");alert("_1_");alert("_0_");alert("_1_");')
        });
    });
});

describe('CLI bin/index.js', function() {
    // Интеграционные тесты запускают реальный CLI в дочернем процессе в настоящем
    // временном каталоге: mock-fs дочерний процесс не видит.
    this.timeout(10000);

    var BIN_PATH = path.join(__dirname, '..', 'bin', 'index.js');
    var tmpRoots = [];

    afterEach(async() => {
        while (tmpRoots.length) {
            fsExtra.remove(tmpRoots.pop());
        }
    });

    var setup = async() => {
        var root = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'dresscodejs-'));
        tmpRoots.push(root);
        await fsExtra.outputFile(path.join(root, 'lib', '.dresscode'), '.\n');
        await fsExtra.outputFile(path.join(root, 'lib', 'Foo', 'index.js'),
            'var Foo = {};\nFoo.bar = function() {\n    alert("$$");\n};\n');
        await fsExtra.outputFile(path.join(root, 'app', '.dresscode'), '../lib\n');
        await fsExtra.outputFile(path.join(root, 'app', 'index.js'), 'Foo.bar();\n');
        return root;
    };

    var run = (root, args) => {
        // promisify(execFile) при успехе разрешается {stdout, stderr} без .code;
        // при ненулевом коде отклоняется ошибкой с .code/.stdout/.stderr. Нормализуем в {code, stdout, stderr}.
        return execFileAsync(process.execPath, [BIN_PATH].concat(args), {cwd: root})
            .then(
                ({stdout, stderr}) => ({code: 0, stdout, stderr}),
                (err) => err
            );
    };

    it('$$ словарь: две последовательные сборки дают одинаковые приватные имена', async() => {
        var root = await setup();
        var first = await run(root, ['-i', 'app/index.js', '-o', 'app/build1.js', '--private-dict', 'dict.json']);
        assert.equal(first.code, 0, first.stderr);
        var out1 = fsExtra.readFileSync(path.join(root, 'app', 'build1.js'), 'utf8');
        var second = await run(root, ['-i', 'app/index.js', '-o', 'app/build2.js', '--private-dict', 'dict.json']);
        assert.equal(second.code, 0, second.stderr);
        var out2 = fsExtra.readFileSync(path.join(root, 'app', 'build2.js'), 'utf8');
        assert.ok(out1.indexOf('alert("_0_")') > -1, out1);
        assert.ok(out2.indexOf('alert("_0_")') > -1, out2);
        assert.equal(out1.trim(), out2.trim());
        assert.deepEqual(fsExtra.readJsonSync(path.join(root, 'dict.json')), ['Foo']);
    });

    it('$$ словарь: имя, уже стоящее в словаре, сохраняет свой индекс', async() => {
        var root = await setup();
        fsExtra.writeJsonSync(path.join(root, 'dict.json'), ['Existing']);
        var result = await run(root, ['-i', 'app/index.js', '-o', 'app/build.js', '--private-dict', 'dict.json']);
        assert.equal(result.code, 0, result.stderr);
        var out = fsExtra.readFileSync(path.join(root, 'app', 'build.js'), 'utf8');
        assert.ok(out.indexOf('alert("_1_")') > -1, out);
        assert.deepEqual(fsExtra.readJsonSync(path.join(root, 'dict.json')), ['Existing', 'Foo']);
    });

    it('$$ словарь: файл словаря (вместе с каталогом) создаётся, если его не было', async() => {
        var root = await setup();
        var result = await run(root, ['-i', 'app/index.js', '-o', 'app/build.js', '--private-dict', 'new-dir/dict.json']);
        assert.equal(result.code, 0, result.stderr);
        assert.deepEqual(fsExtra.readJsonSync(path.join(root, 'new-dir', 'dict.json')), ['Foo']);
    });

    it('$$ словарь: несловарный (не массив) JSON-файл — понятная ошибка, а не краш', async() => {
        var root = await setup();
        fsExtra.writeJsonSync(path.join(root, 'dict.json'), {not: 'array'});
        var result = await run(root, ['-i', 'app/index.js', '-o', 'app/build.js', '--private-dict', 'dict.json']);
        assert.notEqual(result.code, 0);
        assert.ok(result.stderr.indexOf('array') > -1, result.stderr);
    });

    it('$$ словарь: после сборки не остаётся временных файлов', async() => {
        var root = await setup();
        fsExtra.writeJsonSync(path.join(root, 'dict.json'), ['Existing']);
        var result = await run(root, ['-i', 'app/index.js', '-o', 'app/build.js', '--private-dict', 'dict.json']);
        assert.equal(result.code, 0, result.stderr);
        var leftovers = fsExtra.readdirSync(root).filter((name) => /\.tmp$/.test(name));
        assert.deepEqual(leftovers, []);
    });

    describe('Папка в -i: сборка всех js-файлов', () => {
        var setupFolder = async() => {
            var root = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'dresscodejs-'));
            tmpRoots.push(root);
            await fsExtra.outputFile(path.join(root, 'lib', '.dresscode'), '.\n');
            await fsExtra.outputFile(path.join(root, 'lib', 'Widget', 'index.js'),
                'var Widget = {};\nWidget.render = function() {\n    alert("$$");\n};\n');
            await fsExtra.outputFile(path.join(root, 'lib', 'Gadget', 'index.js'),
                'var Gadget = {};\nGadget.render = function() {\n    alert("$$");\n};\n');
            await fsExtra.outputFile(path.join(root, 'app', '.dresscode'), '../lib\n');
            await fsExtra.outputFile(path.join(root, 'app', 'a.js'), 'Widget.render();\n');
            await fsExtra.outputFile(path.join(root, 'app', 'b.js'), 'Gadget.render();\n');
            await fsExtra.outputFile(path.join(root, 'app', 'sub', 'c.js'), 'Widget.render();\n');
            return root;
        };

        it('Все js-файлы (включая вложенные) собираются в папку -o с сохранением структуры', async() => {
            var root = await setupFolder();
            var result = await run(root, ['-i', 'app', '-o', 'build']);
            assert.equal(result.code, 0, result.stderr);
            var a = fsExtra.readFileSync(path.join(root, 'build', 'a.js'), 'utf8');
            var b = fsExtra.readFileSync(path.join(root, 'build', 'b.js'), 'utf8');
            var c = fsExtra.readFileSync(path.join(root, 'build', 'sub', 'c.js'), 'utf8');
            assert.ok(a.indexOf('var Widget = {};') > -1, a);
            assert.ok(a.indexOf('alert("_0_")') > -1, a);
            assert.ok(b.indexOf('var Gadget = {};') > -1, b);
            assert.ok(b.indexOf('alert("_1_")') > -1, b);
            assert.ok(b.indexOf('_0_') === -1, b);
            // Один экземпляр DressCode: тот же компонент даёт то же приватное имя в обоих выходных файлах
            assert.ok(c.indexOf('alert("_0_")') > -1, c);
            assert.equal(c, a);
        });

        it('$$ словарь общий для всех файлов папки: индексы не пересекаются', async() => {
            var root = await setupFolder();
            fsExtra.writeJsonSync(path.join(root, 'dict.json'), ['Existing']);
            var result = await run(root, ['-i', 'app', '-o', 'build', '--private-dict', 'dict.json']);
            assert.equal(result.code, 0, result.stderr);
            var a = fsExtra.readFileSync(path.join(root, 'build', 'a.js'), 'utf8');
            var b = fsExtra.readFileSync(path.join(root, 'build', 'b.js'), 'utf8');
            var c = fsExtra.readFileSync(path.join(root, 'build', 'sub', 'c.js'), 'utf8');
            assert.ok(a.indexOf('alert("_1_")') > -1, a);
            assert.ok(b.indexOf('alert("_2_")') > -1, b);
            assert.ok(c.indexOf('alert("_1_")') > -1, c);
            assert.deepEqual(fsExtra.readJsonSync(path.join(root, 'dict.json')), ['Existing', 'Widget', 'Gadget']);
        });

        it('Без -o в папочном режиме — понятная ошибка и ненулевой код', async() => {
            var root = await setupFolder();
            var result = await run(root, ['-i', 'app']);
            assert.notEqual(result.code, 0);
            assert.ok(result.stderr.indexOf('-o') > -1, result.stdout);
        });

        it('Папка -o, совпадающая с папкой -i — ошибка: нельзя пересобирать исходники на месте', async() => {
            var root = await setupFolder();
            var sourceBefore = fsExtra.readFileSync(path.join(root, 'app', 'a.js'), 'utf8');
            var result = await run(root, ['-i', 'app', '-o', 'app']);
            assert.notEqual(result.code, 0);
            assert.equal(fsExtra.readFileSync(path.join(root, 'app', 'a.js'), 'utf8'), sourceBefore);
        });

        it('Выходной каталог внутри входного: повторный запуск не пересобирает собственные результаты', async() => {
            var root = await setupFolder();
            var first = await run(root, ['-i', 'app', '-o', 'app/build']);
            assert.equal(first.code, 0, first.stderr);
            var firstA = fsExtra.readFileSync(path.join(root, 'app', 'build', 'a.js'), 'utf8');
            assert.ok(!fsExtra.existsSync(path.join(root, 'app', 'build', 'build')));
            var second = await run(root, ['-i', 'app', '-o', 'app/build']);
            assert.equal(second.code, 0, second.stderr);
            var secondA = fsExtra.readFileSync(path.join(root, 'app', 'build', 'a.js'), 'utf8');
            assert.equal(secondA, firstA);
            assert.ok(!fsExtra.existsSync(path.join(root, 'app', 'build', 'build')));
        });
    });
});
