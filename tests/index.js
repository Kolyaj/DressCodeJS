var basePath = 'tests/js-dev';

if (process.argv[2]) {
    require('../lib/compiler').compile(require('path').join(basePath, process.argv[2], 'test.js'), {}, function(err, result) {
        if (err) {
            throw err;
        }
        console.log(result);
    });
} else {
    require('fs').readdir(basePath, function(err, dirs) {
        if (err) {
            throw err;
        }
        dirs.forEach(function(dir) {
            var dirPath = require('path').join(basePath, dir);
            require('fs').stat(dirPath, function(err, stat) {
                if (err) {
                    throw err;
                }
                if (stat.isDirectory()) {
                    require('../lib/compiler').compile(require('path').join(dirPath, 'test.js'), {}, function(err, jossyResult) {
                        if (err) {
                            throw err;
                        }
                        require('fs').readFile(require('path').join(dirPath, 'result.js'), 'utf8', function(err, result) {
                            if (err) {
                                throw err;
                            }
                            var status = jossyResult.trim() == result.trim() ? '\033[92mok\033[39m' : '\033[91mfail\033[39m';
                            var tabs = '\t' + (dir.length < 8 ? '\t' : '');
                            console.log(dir + tabs + status);
                        });
                    });
                }
            });
        });
    });
}
