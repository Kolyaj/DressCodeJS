var {Builder: JossyBuilder} = require('jossy/lib/Builder');
var path = require('path');
var iclass = require('iclass');

module.exports.Builder = iclass.create(JossyBuilder, {
    constructor: function(fname, componentList, indexfile, privatePrefix, debugMode) {
        JossyBuilder.apply(this);

        this._fname = fname;
        this._componentList = componentList;
        this._autoLabels = {};

        if (indexfile) {
            this.appendInclude(indexfile, ['']);
        }

        if (privatePrefix) {
            var tokens = {};
            var tokenIndex = 0;
            this.addMacros(/\$\$(_[a-zA-Z0-9_-]*)?/g, (ignore, tail) => {
                var result = privatePrefix;
                if (tail) {
                    if (debugMode) {
                        result += tail;
                    } else {
                        if (!(tail in tokens)) {
                            tokens[tail] = tokenIndex.toString(36);
                            tokenIndex++;
                        }
                        result += `_${tokens[tail]}`;
                    }
                }
                return result;
            });
        }
    },

    appendRequire: function(componentName, label) {
        if (this._componentList[componentName]) {
            this.appendImport(path.relative(path.dirname(this._fname), this._componentList[componentName].fname), label ? [label] : ['']);
        } else {
            this.appendDresscodeError(`Component ${componentName} not found`);
        }

    },

    appendDresscodeLabel: function(label) {
        if (this._currentBlock.type === 'root') {
            this._autoLabels[label] = true;
            this.appendLabel(label);
        }
    },

    appendDresscodeEndlabel: function(label) {
        if (this._autoLabels[label]) {
            this.appendEndlabel();
        }
    },

    appendDresscodeError: function(message) {
        this.appendCode(`throw new Error("DresscodeError: ${message}.");\n`);
    }
});
