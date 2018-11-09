var iclass = require('iclass');
var {Jossy} = require('../../jossy');
var {Parser} = require('./Parser');
var {Builder} = require('./Builder');
var path = require('path');
var fs = require('fs');
var {promisify} = require('util');

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
        this._componentLists = {};
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

    _createBuilder: function(fname) {
        var dirname = path.dirname(fname);
        var components = this._componentsForDir[dirname];
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
