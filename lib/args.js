module.exports = (function(argv) {
    var res = {};
    var key = '';
    for (var i = 2; i < argv.length; i++) {
        if (argv[i].indexOf('-') == 0) {
            key = argv[i].slice(1);
            res[key] = true;
        } else {
            if (!res[key]) {
                res[key] = [];
            }
            res[key].push(argv[i]);
            key = '';
        }
    }
    return res;
})(process.argv);
