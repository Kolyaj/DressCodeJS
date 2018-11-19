var iclass = require('iclass');
var {Jossy} = require('../../jossy');
var {Parser} = require('./Parser');
var {Builder} = require('./Builder');
var path = require('path');
var fs = require('fs');
var {promisify} = require('util');
var ecmaParser = require('./ecma-parser');

var readFile = promisify(fs.readFile);
var readdir = promisify(fs.readdir);
var stat = promisify(fs.stat);

module.exports = function(fname, context, debugMode) {
    return new module.exports.DressCode(debugMode).compile(fname, context);
};

module.exports.DressCode = iclass.create(Jossy, {
    dresscodeFileName: '.dresscode',

    privatePrefix: '_',

    parserCtor: Parser,


    constructor: function(debugMode) {
        Jossy.call(this);

        this._debugMode = debugMode;
        this._dresscodeFilePromises = {};
        this._componentsInDirPromises = {};
        this._componentsForDirPromises = {};
        this._componentsForDir = {};
        this._privatePrefixIndex = 0;
    },

    getDresscodeFileContent: function(dirname) {
        if (!this._dresscodeFilePromises[dirname]) {
            var dresscodeFilePath = path.join(dirname, this.dresscodeFileName);
            this._dresscodeFilePromises[dirname] = readFile(dresscodeFilePath, 'utf8').then((content) => {
                return content.split('\n').map((line) => {
                    line = line.trim();
                    if (line) {
                        return path.resolve(dirname, line);
                    }
                }).filter(Boolean);
            }).catch((err) => {
                if (err.code === 'ENOENT') {
                    var parentDirname = path.dirname(dirname);
                    return parentDirname === dirname ? [] : this.getDresscodeFileContent(parentDirname);
                } else {
                    throw err;
                }
            });
        }
        return this._dresscodeFilePromises[dirname];
    },

    getComponentsInDir: function(dirname) {
        if (!this._componentsInDirPromises[dirname]) {
            this._componentsInDirPromises[dirname] = this._makeComponentsInDir(dirname);
        }
        return this._componentsInDirPromises[dirname];
    },

    getComponentsForDir: function(dirname) {
        if (!this._componentsForDirPromises[dirname]) {
            this._componentsForDirPromises[dirname] = this._makeComponentsForDir(dirname);
        }
        return this._componentsForDirPromises[dirname];
    },


    _parse: function(fname) {
        return this.getComponentsForDir(path.dirname(fname)).then(() => {
            return module.exports.DressCode.superclass._parse.call(this, fname);
        });
    },

    _parseCode: function(code, fname) {
        var {usages, declarations} = ecmaParser.parse(code);
        var components = this._componentsForDir[path.dirname(fname)];
        var componentInFile = components.byfname[fname];
        var injections = {};
        if (componentInFile) {
            declarations.forEach((declaration) => {
                if (declaration.leftPart.left === componentInFile.cname && /^[a-z]/.test(declaration.leftPart.right) && !['prototype', 'toString', 'valueOf'].includes(declaration.leftPart.right)) {
                    var startPosition = declaration.start;
                    var endPosition = declaration.end;
                    if (code[endPosition] === '\n') {
                        endPosition += 1;
                    } else if (code[endPosition] === '\r' && code[endPosition + 1] === '\n') {
                        endPosition += 2;
                    } else if (code[endPosition] === '\r') {
                        endPosition += 1;
                    } else if (endPosition === code.length) {
                        code += '\n';
                        endPosition += 1;
                    }
                    if (!injections[startPosition]) {
                        injections[startPosition] = '';
                    }
                    injections[startPosition] += `/*#dresscode_label ${declaration.leftPart.right}#*/`;
                    injections[endPosition] = endPosition === declaration.end ? `/*#dresscode_endlabel ${declaration.leftPart.right}#*/` : `//#dresscode_endlabel ${declaration.leftPart.right}\n`;
                }
            });
        }
        usages.forEach((usage) => {
            var cname = /^[a-z]/.test(usage.right) ? usage.left : usage.cname;
            if (!injections[usage.start] && components.bycname[cname]) {
                injections[usage.start] = `/*#require ${usage.cname}#*/`;
            }
        });
        Object.keys(injections).map((position) => {
            return {
                position: position,
                content: injections[position]
            };
        }).sort((item1, item2) => {
            return item2.position - item1.position;
        }).forEach(({position, content}) => {
            code = code.substr(0, position) + content + code.substr(position);
        });
        return module.exports.DressCode.superclass._parseCode.call(this, code, fname);
    },

    _createBuilder: function(fname) {
        var components = this._componentsForDir[path.dirname(fname)];
        var componentInFile = components.byfname[fname];
        var privatePrefix = null;
        if (componentInFile) {
            this._privatePrefixIndex++;
            privatePrefix = this._debugMode ? componentInFile.cname.replace(/\./g, '_') : `${this.privatePrefix}${this._privatePrefixIndex.toString(36)}`;
        }
        return new Builder(fname, components.bycname, componentInFile && componentInFile.indexfile, privatePrefix, this._debugMode);
    },

    _makeComponentsForDir: function(dirname) {
        this._componentsForDir[dirname] = {
            byfname: {},
            bycname: {}
        };
        var fulllist = [];
        return this.getDresscodeFileContent(dirname).then((dependencies) => {
            return Promise.all(dependencies.map((dependency) => {
                return this.getComponentsInDir(dependency).then((list) => {
                    list.forEach((item) => {
                        this._componentsForDir[dirname].byfname[item.fname] = item;
                        this._componentsForDir[dirname].bycname[item.cname] = item;
                        fulllist.push(item);
                    });
                });
            }));
        }).then(() => {
            return fulllist;
        });
    },

    _makeComponentsInDir: function(dirname, prefix) {
        prefix = prefix || '';
        return readdir(dirname).then((items) => {
            var list = [];
            return Promise.all(items.map((item) => {
                var fullname = path.resolve(dirname, item);
                if (item === 'index.js' && prefix) {
                    list.push({
                        fname: fullname,
                        cname: prefix,
                        indexfile: prefix.indexOf('.') > -1 ? '../index.js' : null
                    });
                } else if (/^[A-Z]/.test(item)) {
                    return stat(fullname).then((stat) => {
                        if (stat.isFile() && /^[A-Za-z0-9]+\.js$/.test(item) && prefix) {
                            list.push({
                                fname: fullname,
                                cname: `${prefix}.${item.substring(0, item.length - 3)}`,
                                indexfile: 'index.js'
                            });
                        } else if (stat.isDirectory() && /^[A-Za-z0-9]+$/.test(item)) {
                            return this._makeComponentsInDir(fullname, (prefix ? prefix + '.' : '') + item).then((subcomponents) => {
                                list.push(...subcomponents);
                            });
                        }
                    });
                }
            })).then(() => {
                return list;
            });
        }).catch((err) => {
            if (err.code === 'ENOENT') {
                return [];
            } else {
                throw err;
            }
        });
    }
});
