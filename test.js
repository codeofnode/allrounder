const { options } = require('./extractArgs');
const testFile = require('./index');

if (!options.jsondir && !options.file) {
  throw new Error('`jsondir` or `file` argument is a must.');
}
delete options.read;
testFile.init(options,true);
testFile.start();
