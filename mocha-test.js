const { options } = require('./extractArgs');
const testFile = require('./index');

if (!options.jsondir && !options.file && !options.srcdir) {
  throw new Error('`jsondir` or `file` argument is a must.');
}
delete options.read;
testFile.init(options,true);
testFile.start();
