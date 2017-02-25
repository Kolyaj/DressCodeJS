var iclass = require('iclass');
var {Jossy} = require('jossy');
var Parser = require('./Parser');
var path = require('path');
var fs = require('fs');

module.exports = iclass.create(Jossy, {
    dresscodeFileName: '.dresscode',

    constructor: function(debugMode) {
        Jossy.call(this);

        this._debugMode = debugMode;
        this._dresscodeFiles = {};
        this._componentLists = {};
    },


    _createParserInstance: function(fname) {
        var dirname = path.dirname(fname);
        var componentList = {};
        var parentIndex;
        var privatePrefix;
        var privatePrefixIndex = 0;
        return this._getDresscodeFileContent(dirname).then((dependencies) => {
            return Promise.all(dependencies.map((dependency) => {
                return this._getComponentList(dependency).then((list) => {
                    Object.keys(list).forEach((key) => {
                        if (list[key] == fname) {
                            privatePrefix = this._debugMode ? key.replace(/\./g, '_') : `$${privatePrefixIndex++}`;
                            if (/\/index\.js$/.test(fname)) {
                                if (key.indexOf('.') > -1) {
                                    parentIndex = '../index.js';
                                }
                            } else {
                                parentIndex = 'index.js';
                            }
                        }
                        componentList[key] = path.relative(dirname, list[key]);
                    });
                });
            }));
        }).then(() => {
            return new Parser(componentList, parentIndex, privatePrefix, this._debugMode);
        });
    },

    _getComponentList: function(dirname) {
        if (!this._componentLists[dirname]) {
            this._componentLists[dirname] = this._makeComponentList(dirname);
        }
        return this._componentLists[dirname];
    },

    _makeComponentList: function(dirname, prefix) {
        prefix = prefix || '';
        return this._readdir(dirname).then((items) => {
            var list = {};
            return Promise.all(items.map((item) => {
                var fullname = path.resolve(dirname, item);
                if (item == 'index.js' && prefix) {
                    list[prefix] = fullname;
                } else if (/^A-Z/.test(item)) {
                    return this._stat(fullname).then((stat) => {
                        if (stat.isFile() && /^[A-Za-z0-9]+\.js$/.test(item) && prefix) {
                            list[`${prefix}.${item.substring(0, item.length - 3)}`] = fullname;
                        } else if (stat.isDirectory() && /^[A-Za-z0-9]+$/.test(item)) {
                            return this._makeComponentList(fullname, (prefix ? prefix + '.' : '') + item).then((subcomponents) => {
                                Object.assign(list, subcomponents);
                            });
                        }
                    });
                }
            }).filter(Boolean)).then(() => {
                return list;
            });
        }).catch((err) => {
            if (err.code == 'ENOENT') {
                return {};
            } else {
                throw err;
            }
        });
    },


    _getDresscodeFileContent: function(dirname) {
        if (!this._dresscodeFiles[dirname]) {
            var dresscodeFilePath = path.join(dirname, this.dresscodeFileName);
            this._dresscodeFiles[dirname] = this._readFile(dresscodeFilePath).then((content) => {
                return content.split('\n').map((line) => {
                    line = line.trim();
                    if (line) {
                        return path.resolve(dirname, line);
                    }
                }).filter(Boolean);
            }).catch((err) => {
                if (err.code == 'ENOENT') {
                    var parentDirname = path.dirname(dirname);
                    return parentDirname == '.' ? [] : this._getDresscodeFileContent(parentDirname);
                } else {
                    throw err;
                }
            });
        }
        return this._dresscodeFiles[dirname];
    },

    _readFile: function(fname) {
        return this._promisify(fs.readFile, fname);
    },

    _readdir: function(dirname) {
        return this._promisify(fs.readdir, dirname);
    },

    _stat: function(fname) {
        return this._promisify(fs.stat, fname);
    },

    _promisify: function(fn) {
        return new Promise((resolve, reject) => {
            fn.apply(null, [].slice.call(arguments, 1).concat((err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            }));
        });
    }
});
