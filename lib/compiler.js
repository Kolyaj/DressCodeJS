exports.compile = function(fpath, flags, callback) {
    var src = '';

    require('jossy').compile(function(fpath, callback) {
        require('fs').readFile(fpath, 'utf8', function(err, content) {
            if (err) {
                return callback(err);
            }
            var prefix = '';
            if (src) {
                var relPath = require('path').relative(src, fpath);
                if (relPath.indexOf('.') != 0) {
                    prefix += '//#define $_ ' + relPath.replace(/([\/\\]index)?\.js$/, '').replace(/[\\/]/g, '_') + '_\n';
                    if (!/\/index\.js$/.test(fpath)) {
                        prefix += '//#include index.js\n';
                    }
                }
            }
            callback(null, prefix + content.split('\n').map(function(line) {
                if (line.match(/^\s*\/\/#source\s+(\S+)\s*$/)) {
                    var relativeSrc = RegExp.$1;
                    src = require('path').join(require('path').dirname(fpath), relativeSrc);
                    return '';
                }

                if (line.match(/^\s*\/\/#require ([a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*)((?:::[a-zA-Z0-9]+)*)\s*$/)) {
                    if (src) {
                        var className = RegExp.$1;
                        var labels = RegExp.$2;
                        var baseName = require('path').join(src, className.replace(/\./g, '/'));
                        var fname = require('fs').existsSync(baseName + '/index.js') ? baseName + '/index.js' : baseName + '.js';
                        return '//#include ' + require('path').relative(require('path').dirname(fpath), fname) + labels;
                    } else {
                        return 'throw new Error("DressCode.js: not configured source directory for use require directive.");';
                    }
                }

                return line;
            }).join('\n'));
        });
    }, fpath, [], flags, callback);
};
