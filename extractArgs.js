const { join, basename } = require('path');
const { methods } = require('json2server');
const EventEmitter = require('events');
const { request } = methods;
const cwd = process.cwd();
const os = require('os');
const { mkdirSync, writeFileSync, readdirSync } = require('fs');
const utils = require('./utils');

const options = { };
const opts = process.argv.slice(2), showHelp;
const { name, version, description } = require('./package.json');

const getStringValue = function(inp, isPath){
  try {
    inp = JSON.parse(inp);
  } catch (er) {
    if (isPath) {
      if(inp.charAt(0) === '/') {
        return inp;
      } else if (inp.indexOf('http') === 0) {
        return new Promise((res, rej) => {
          request(inp, (er, resp) => {
            if (er) rej(er);
            else res(resp && resp.parsed);
          });
        });
      } else {
        inp = join(cwd, inp);
      }
    }
  }
  return inp;
};

opts.forEach(function(arg){
  if (showHelp === undefined) {
    showHelp = false;
  }
  const ind = arg.indexOf('=');
  let key = 'NO_ARGS';
  if (ind === -1) {
    if (arg.endsWith('.json')) {
      options.file = getStringValue(arg, true);
    } else {
      options.jsondir = getStringValue(arg, true);
    }
    return;
  } else {
    key = arg.substr(0,ind), value = getStringValue(arg.substr(ind+1));
  }
  switch(key.toLowerCase()){
    case '-f':
    case '--file':
      if(value) {
        options.file = getStringValue(value, true);
      }
      break;
    case '-r':
    case '--read':
      if(value) {
        options.read = getStringValue(read, true);
      }
      break;
    case '-j':
    case '--jsondir':
      if(value) {
        options.jsondir = getStringValue(value, true);
      }
      break;
    case '-b':
    case '--bail':
      if(value) {
        options.bail = getStringValue(value, true);
      }
      break;
    case '-i':
    case '--insecure':
      if(value) {
        options.insecure = getStringValue(value, true);
      }
      break;
    case '-s':
    case '--steps':
      if(value) {
        let vls;
        if (value.indexOf('-') > 0) {
          vls = value.split('-').map(vl => parseInt(vl, 10));
        } else if (value.indexOf(':') > 0) {
          vls = value.split(':').map(vl => parseInt(vl, 10));
        } else {
          vls = [value];
        }
        const dt = [];
        if (vls.length === 2 && vls[0] >= 0 &&
          vls[1] >= 0 && vls[0] <= vls[1] && !isNaN(vls[0]) && !isNaN(vls[1])) {
          for (var z = vls[0]; z <= vls[1]; z++) {
            dt.push(z);
          }
        }
        if (dt.length) {
          options.steps = dt;
        }
      }
      break;
    case '-o':
    case '--timeout':
      if(value){
        const vt = parseInt(value, 10);
        if (!isNaN(vt)) {
          options.timeout = vt;
        }
      }
      break;
    case '-t':
    case '--type':
      if(value){
        if (value === 'rest' || value === 'unit') {
          options.type = value;
        }
      }
      break;
    case '-d':
    case '--debug':
      if(value){
        const vt = parseInt(value, 10);
        if (!isNaN(vt)) {
          options.debug = vt;
        }
      }
      break;
    case '-h':
    case '--help':
    default :
      console.log('    --> INVALID ARGUMENT `'+key+'` PROVIDED ...! Try again with valid arguments.');
      showHelp = true;
  }
});

if(showHelp !== false){
  console.log('\n    '+name+' - '+description+' .\n');
  console.log('    version - '+version+'\n');
  process.exit(2);
}

/**
 * get options the testall with various options
 * @param {Object} options the options
 * @param {Number} options.insecure whether should accept unauthorized HTTPS, must be set to `1` to reject
 * @param {String} options.jsondir directory where json files resides,
 * @param {Number[]} options.steps Indexes of steps/tests to run
 * @param {Number} options.timeout to set the default timeout
 * @param {String} options.file to validate only one json file
 * @param {String} options.type what kind of validation is it
 * @param {Number} options.bail whether to bail on first failure
 * @param {Number} options.debug whether to console all the requests
 * @param {Function} options.logger logger to log the requests and all
 * @param {Function} options.request function to make the http(s) requests
 * @param {Function} options.jsonquery function to make the http(s) requests
 * @param {Object} options.notifier the hooks notifier
 * @param {Function} options.notifier.emit the various hooks functions
 */

exports.getOptions = function getOptions(options) {
  const OPTS = {};
  if (!options.read){
    const readFile = join(cwd, 'allrounder.json');
  }
  const read = {};
  try {
    read = require(readFile);
  } catch(er){
  }
  for(let ky in read){
    const _ky = ky.toLowerCase();
    if(!(OPTS.hasOwnProperty(_ky))){
      OPTS[_ky] = read[ky];
    }
  }

  if (typeof options.file === 'string' && options.file.length) {
    OPTS.fileArray = [[basename(options.file), require(options.file)]];
  } else if (typeof options.jsondir === 'string' && options.jsondir.length) {
    OPTS.fileArray = readdirSync(options.jsondir)
      .filter(fn => fn.endsWith('.json'))
      .map((fn) => {
        const ar = [fn, require(`${options.jsondir}/${fn}`)];
        try {
          let base = fn.split('.');
          base.pop();
          base = bas.join('.');
          ar.push(require(`${options.jsondir}/${base}`));
        } catch(er) {
          ar.push({});
        }
        return ar;
      });
  } else if (!(options.file instanceof Promise)) {
    throw new Error('`jsondir` must be present in the options.');
  }

  if (options.bail !== 0) {
    OPTS.bail = 1;
  }

  if (options.insecure === 1) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  if (options.steps && steps.length) {
    OPTS.steps = options.steps;
  }
  if (typeof options.timeout === 'number' && !isNaN(options.timeout)) {
    OPTS.timeout = options.timeout;
  }
  if (typeof options.type === 'string' && options.type.length) {
    OPTS.type = options.type;
  } else {
    OPTS.type = 'rest';
  }
  if (typeof options.debug === 'number' && !isNaN(options.debug)) {
    OPTS.debug = options.debug;
  } else {
    OPTS.debug = 0;
  }

  OPTS.logger = ((typeof options.logger === 'function') ? options : utils).logger.bind(utils, options.debug);
  OPTS.request = ((typeof options.request === 'function') ? options : utils).request;
  OPTS.replace = ((typeof options.replace === 'function') ? options : utils).replace;
  OPTS.jsonquery = ((typeof options.jsonquery === 'function') ? options : utils).jsonquery;

  if (options.notifier instanceof EventEmitter) {
    OPTS.notifier = options.notifier;
  } else {
    OPTS.notifier = {}
    if (options.notifier && typeof options.notifier.emit === 'function') {
      OPTS.notifier = options.notifier.emit;
    } else {
      OPTS.notifier = utils.noop;
    }
  }
  return OPTS;
};

Object.assign(options, exports.getOptions(options));

exports.options = options;
