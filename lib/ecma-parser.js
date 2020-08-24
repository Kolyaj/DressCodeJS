var esprima = require('esprima');

exports.parse = function(code) {
    var usages = {};
    var declarations = [];

    try {
        var ast = esprima.parseScript(code, {range: true}, (node) => {
            if (node.type === 'MemberExpression') {
                var usage = prepareUsage(node);
                if (usage && (!usages[usage.start] || usages[usage.start].cname.length < usage.cname.length)) {
                    usages[usage.start] = usage;
                }
            }
        });
    } catch (ignored) {
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
        declarations: declarations
    };
};

function prepareUsage(node) {
    if (!node.computed) {
        var leftPart = prepareLeftPartOfUsage(node);
        if (leftPart) {
            var rightPart = node.property.name;
            return {
                cname: leftPart + '.' + rightPart,
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
