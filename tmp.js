var {promisify} = require('util');
var fs = require('fs');

var readFile = promisify(fs.readFile);
var writeFile = promisify(fs.writeFile);

readFile(process.argv[2], 'utf8').then((content) => {
    return writeFile(process.argv[2], content.split('\n').map((line) => {
        return line.trim();
    }).filter(Boolean).sort((line1, line2) => {
        return line1 > line2 ? 1 : line1 < line2 ? -1 : 0;
    }).join('\n'), 'utf8');
});
