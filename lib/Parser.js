var {Parser: JossyParser} = require('jossy/lib/Parser');
var iclass = require('iclass');

module.exports.Parser = iclass.create(JossyParser, {
    constructor: function() {
        JossyParser.call(this);

        this._registerDirective('require', true, (builder, params) => {
            var cname = '';
            var label = '';
            if (params.match(/^(.*)\[(['"])([^'"]+)\2]$/)) {
                cname = RegExp.$1;
                label = RegExp.$3;
            } else {
                var paramsParts = params.split('.');
                var lastPart = paramsParts.pop();
                if (/^[a-z]/.test(lastPart)) {
                    label = lastPart;
                } else {
                    paramsParts.push(lastPart);
                }
                cname = paramsParts.join('.');
            }
            builder.appendRequire(cname, label);
        });

        this._registerDirective('dresscode_label', true, (builder, params) => {
            builder.appendDresscodeLabel(params);
        });

        this._registerDirective('dresscode_endlabel', true, (builder, params) => {
            builder.appendDresscodeEndlabel(params);
        })
    }
});
