var {JossyParser} = require('jossy');
var iclass =require('iclass');

module.exports = iclass.create(JossyParser, {
    constructor: function(componentList, parentIndex, privatePrefix, debugMode) {
        JossyParser.call(this);

        if (parentIndex) {
            this.write(`//#include ${parentIndex}::\n`);
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
                        if (!tokens[tail]) {
                            tokens[tail] = tokenIndex++;
                        }
                        result += tokens[tail];
                    }
                }
                return result;
            });
        }

        this._registerDirective('require', true, (params) => {
            var paramsParts = params.split('.');
            var label = '';
            var lastPart = paramsParts.pop();
            if (/^[a-z]/.test(lastPart)) {
                label = `::${lastPart}`;
            } else {
                paramsParts.push(lastPart);
            }
            var component = paramsParts.join('.');
            if (componentList[component]) {
                return `//#include ${componentList[component]}${label}\n`;
            } else {
                // ....
            }
        });
    }
});
