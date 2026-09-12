var esprima = require('esprima-next');

exports.parse = function(code) {
    var usages = {};
    var declarations = [];
    var error = null;

    try {
        var ast = esprima.parseScript(code, {range: true}, (node) => {
            if (node.type === 'MemberExpression') {
                var usage = prepareUsage(node);
                if (usage && (!usages[usage.start] || usages[usage.start].cname.length < usage.cname.length)) {
                    usages[usage.start] = usage;
                }
            }
        });
    } catch (err) {
        // A syntax error makes the partial visitor results untrustworthy: the file
        // is passed through unprocessed (empty map), so the user meets the parse
        // error in the build output and notices it there.
        error = err;
        usages = {};
    }

    if (ast) {
        ast.body.forEach((node) => {
            var leftPart = usages[node.range[0]];
            if (node.type === 'ExpressionStatement' && leftPart) {
                declarations.push({
                    start: node.range[0],
                    end: node.range[1],
                    leftPart: leftPart
                });
            }
        });
    }

    return {
        usages: Object.keys(usages).map((key) => {
            return usages[key];
        }),
        declarations: declarations,
        error: error
    };
};

function prepareUsage(node) {
    if (!node.computed || (node.computed && node.property.type === 'Literal' && typeof node.property.value === 'string')) {
        var leftPart = prepareLeftPartOfUsage(node);
        if (leftPart) {
            var rightPart = node.computed ? node.property.value : node.property.name;
            return {
                cname: leftPart + (node.computed ? `['${rightPart}']` : `.${rightPart}`),
                left: leftPart,
                right: rightPart,
                start: node.range[0]
            };
        }
    }
    return '';
}

function prepareLeftPartOfUsage(node) {
    if (node.object.type === 'Identifier') {
        return node.object.name;
    } else if (node.object.type === 'MemberExpression') {
        var leftPart = prepareUsage(node.object);
        if (/^[A-Z]/.test(leftPart.right)) {
            return leftPart && leftPart.cname;
        }
    }
    return null;
}
