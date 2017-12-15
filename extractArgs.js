const { join, isAbsolute, basename, dirname } = require('path');
const { methods } = require('json2server');
const EventEmitter = require('events');
const { request } = methods;
const cwd = process.cwd();
const os = require('os');
const { mkdirSync, readdirSync } = require('fs');
const utils = require('./utils');

const options = { };
const opts = process.argv.slice(2);
const { name, version, description } = require('./package.json');
let showHelp;
let parsingDone = false;

function getObjectFromFileOrArgument (inp) {
  if (typeof inp === 'string') {
    if (inp.endsWith('.json')) {
      try {
        return require(getStringValue(inp, true));
      } catch (er) {
      }
    }
    try {
      return JSON.parse(inp);
    } catch (er) {
    }
  }
  return inp;
};

function resolvePipe(value, options) {
  const val = getStringValue(value, true);
  if (isAbsolute(val)) {
    options.pipePath = val;
  }
  options.pipeVars = getObjectFromFileOrArgument(val);
}

const getStringValue = function(inp, isPath){
  try {
    inp = JSON.parse(inp);
  } catch (er) {
    if (isPath) {
      if (isAbsolute(inp)) {
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

function parseReq(splits) {
  parsingDone = true;
  if (!splits.length) return parsingDone = false;
  if (splits[0].indexOf('=') > 1) {
    options.type = splits[0].split('=').pop();
  } else {
    options.type = 'rest';
  }
  const request = {};
  switch(options.type) {
    case 'command':
      request.payload = splits[1];
      if (splits[2]) {
        request.options = getObjectFromFileOrArgument(splits[2]);
      }
      if (!options.debug) {
        options.debug = 'payload,output,error';
      }
      break;
    case 'db':
      request.dbName = splits[1];
      request.connectionName = splits[2];
      if (splits[3]) {
        request.payload = getObjectFromFileOrArgument(splits[3]);
      }
      if (splits[4]) {
        request.dbConfig = getObjectFromFileOrArgument(splits[4]);
      }
      if (!options.debug) {
        options.debug = 'payload,output,message';
      }
      break;
    default:
      if (splits[1].indexOf('http') === 0) {
        splits.splice(1, 0, 'GET');
      }
      request.method = splits[1];
      request.url = splits[2];
      if (splits[3]) {
        request.headers = getObjectFromFileOrArgument(splits[3]);
      }
      if (splits[4]) {
        request.payload = getObjectFromFileOrArgument(splits[4]);
      }
      if (splits[5]) {
        request.payloadStream = splits[5];
      }
      if (splits[6]) {
        request.multipartOptions = getObjectFromFileOrArgument(splits[6]);
      }
      if (!options.debug) {
        options.debug = 'url,payload,parsed';
      }
  }
  options.file = new Promise((res, rej) => {
    res({
      tests: [{ request: request }]
    });
  });
}

function parseArguments() {
  opts.forEach(function(arg, oind){
    if (parsingDone) return;
    if (showHelp === undefined) {
      showHelp = false;
    }
    const ind = arg.indexOf('=');
    const larg = arg.toLowerCase();
    const value = getStringValue(arg.substr(ind+1));
    let key = larg.substr(0, ind) || larg;
    if (key === '-e' || key === '--exec') {
      return parseReq(opts.slice(oind));
    }
    if (ind === -1) {
      if (arg.endsWith('.json')) {
        key = '-f';
      } else if (!(arg.startsWith('-'))){
        key = '-j';
      }
    }
    switch(key){
      case '-f':
      case '--file':
        if (value) {
          options.file = getStringValue(value, true);
        }
        break;
      case '-r':
      case '--read':
        if (value) {
          options.read = getStringValue(read, true);
        }
        break;
      case '-j':
      case '--jsondir':
        if (value) {
          options.jsondir = getStringValue(value, true);
        }
        break;
      case '-b':
      case '--bail':
        if (typeof value === 'number') {
          options.bail = value;
        }
        break;
      case '-i':
      case '--insecure':
        if (typeof value === 'number') {
          options.insecure = value;
        }
        break;
      case '-z':
      case '--vars':
        if (value) {
          options.vars = getObjectFromFileOrArgument(value);
        }
        break;
      case '-m':
      case '--mocha':
        if (value) {
          options.mocha = getObjectFromFileOrArgument(value);
        }
        break;
      case '-p':
      case '--pipe':
        if (value) {
          resolvePipe(value, options);
        }
        break;
      case '-s':
      case '--steps':
        if (value) {
          if (typeof value === 'number') {
            options.steps = [value];
          } else if (Array.isArray(value)) {
            options.steps = value.map(vl => parseInt(vl, 10));
          } else if (typeof value === 'string') {
            let vls;
            if (value.indexOf('-') > 0) {
              vls = value.split('-').map(vl => parseInt(vl, 10));
            } else if (value.indexOf(':') > 0) {
              vls = value.split(':').map(vl => parseInt(vl, 10));
            }
            if (Array.isArray(vls)) {
              const dt = [];
              if (vls.length === 2 && vls[0] >= 0 &&
                vls[1] >= 0 && vls[0] <= vls[1] && !isNaN(vls[0]) && !isNaN(vls[1])) {
                for (let z = vls[0]; z <= vls[1]; z++) {
                  dt.push(z);
                }
              }
              if (dt.length) {
                options.steps = dt;
              }
            }
          }
        }
        break;
      case '-o':
      case '--timeout':
        if (value){
          const vt = parseInt(value, 10);
          if (!isNaN(vt)) {
            options.timeout = vt;
          }
        }
        break;
      case '--whileinterval':
        if (value){
          const vt = parseInt(value, 10);
          if (!isNaN(vt)) {
            options.whileinterval = vt;
          }
        }
        break;
      case '-t':
      case '--type':
        if (value){
          options.type = value;
        }
        break;
      case '-d':
      case '--debug':
        if (value){
          options.debug = value;
        }
        break;
      case '-h':
      case '--help':
      case '-v':
      case '--version':
        parsingDone = true;
        showHelp = true;
        break;
      default :
        console.log('    --> INVALID ARGUMENT `'+key+'` PROVIDED ...! Try again with valid arguments.');
        showHelp = true;
    }
  });

  if (showHelp !== false){
    console.log('\n    '+name+' - '+description+' .\n');
    console.log('    version - '+version+'\n');
    process.exit(2);
  }
}

const filesMap = {};

function getArp(jsondir, fn) {
  const bname = basename(fn);
  if (filesMap[bname]) return filesMap[bname];
  const ar = [bname];
  try {
    ar.push(require(`${jsondir}/${fn}`));
  } catch(er) {
    ar.push({ tests : [] });
  }
  try {
    let base = fn.split('.');
    base.pop();
    base = bas.join('.');
    ar.push(require(`${jsondir}/${base}`));
  } catch(er) {
    ar.push({});
  }
  if (typeof ar[2].EVAL !== 'function') ar[2].EVAL = eval;
  filesMap[bname] = ar;
  return ar;
}

function getTests(fl) {
  return fl.tests || fl.testcases || fl.steps || fl.entries || fl.records;
}

function resolveJson (fa) {
  const fl = fa[1];
  const tests = getTests(fl);
  if (Array.isArray(tests)) {
    let ln = tests.length;
    for (let z = 0; z < ln; z++) {
      const steps = tests[z].steps;
      if (typeof tests[z].import === 'string' && !tests[z].disabled) {
        if (!tests[z].import.endsWith('.json')) {
          tests[z].import += '.json';
        }
        let arp = getArp(options.jsondir, tests[z].import);
        let ar = arp[1];
        if (tests[z].fetchVars !== false) {
          if (typeof ar.vars === 'object' && ar.vars !== null) {
            fl.vars = Object.assign({}, ar.vars, fl.vars);
          }
          if (typeof arp[2] === 'object' && arp[2] !== null) {
            fa[2] = Object.assign({}, arp[2], fa[2]);
          }
        }
        if (tests[z].fetchVars === true) {
          tests[z].disabled = true;
          continue;
        }
        if (!Array.isArray(ar)) {
          ar = getTests(ar);
        }
        if (Array.isArray(ar)) {
          ar = JSON.parse(JSON.stringify(ar));
          if (steps !== undefined) {
            const art = [];
            if (Array.isArray(steps)) {
              steps.forEach(st => {
                if (typeof st === 'number' && ar[st]) {
                  art.push(ar[st]);
                }
              });
            } else if (typeof steps === 'object' && steps !== null
                && (typeof steps.from === 'number' || typeof steps.to === 'number')) {
              for (let j = steps.from || 0; ar[j] && (typeof steps.to === 'number' ? j <= steps.to : true); j++) {
                art.push(ar[j]);
              }
            } else if (typeof steps === 'number' && ar[steps]) {
              art.push(ar[steps]);
            }
            ar = art;
          }
          tests.splice.bind(tests, z, 1).apply(tests, ar);
          ln += ar.length - 1;
          z--;
        }
      }
    }
    fl.tests = tests;
  }
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
 * @param {String} options.debug whether to console all the requests
 * @param {String} options.pipe pipe the vars from one execution to another
 * @param {Function} options.logger logger to log the requests and all
 * @param {Function} options.request function to make the http(s) requests
 * @param {Function} options.jsonquery function to make the http(s) requests
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
    if (!(OPTS.hasOwnProperty(_ky))){
      OPTS[_ky] = read[ky];
    }
  }

  if (typeof options.file === 'string' && options.file.length) {
    OPTS.fileArray = [[basename(options.file), require(options.file), { EVAL: eval }]];
  } else if (typeof options.jsondir === 'string' && options.jsondir.length) {
    OPTS.fileArray = readdirSync(options.jsondir)
      .filter(fn => fn.endsWith('.json'))
      .map(getArp.bind(null, options.jsondir));
  } else if (!(options.file instanceof Promise)) {
    throw new Error('`jsondir` must be present in the options.');
  }

  if ((typeof options.jsondir !== 'string' || !options.jsondir.length)
    && (typeof options.file === 'string' && options.file.length)) {
    options.jsondir = dirname(options.file);
  }

  if (typeof options.jsondir === 'string' && options.jsondir.length) {
    OPTS.fileArray.forEach(resolveJson);
  }

  if (options.bail !== 0) {
    OPTS.bail = 1;
  }

  if (options.insecure === 1) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  if (options.steps && options.steps.length) {
    OPTS.steps = options.steps;
  }
  if (typeof options.timeout === 'number' && !isNaN(options.timeout)) {
    OPTS.timeout = options.timeout;
  }
  if (typeof options.whileinterval === 'number' && !isNaN(options.whileinterval)) {
    OPTS.whileinterval = options.whileinterval;
  } else {
    OPTS.whileinterval = 1000;
  }
  if (typeof options.type === 'string' && options.type.length) {
    OPTS.type = options.type;
  } else {
    OPTS.type = 'rest';
  }
  if (typeof options.debug === 'string' && options.debug.length) {
    OPTS.debug = options.debug;
  } else {
    OPTS.debug = '';
  }

  let vars = {};
  if (typeof options.vars === 'object' && options.vars !== null) {
    vars = options.vars;
  }
  let mocha = {};
  if (typeof options.mocha === 'object' && options.mocha !== null) {
    mocha = options.mocha;
  }
  if (typeof options.pipe === 'string' && options.pipe.length) {
    resolvePipe(options.pipe, OPTS);
    Object.assign(vars, OPTS.pipeVars);
  } else {
    if (typeof options.pipePath === 'string' && options.pipePath.length) {
      OPTS.pipePath = getStringValue(options.pipePath, true);
    }
    if (typeof options.pipeVars === 'object' && options.pipeVars !== null) {
      Object.assign(vars, options.pipeVars);
    }
  }
  delete OPTS.pipeVars;
  OPTS.vars = vars;
  OPTS.mocha = mocha;

  OPTS.logger = ((typeof options.logger === 'function') ? options : utils).logger;
  OPTS.request = ((typeof options.request === 'function') ? options : utils).request;
  OPTS.replace = ((typeof options.replace === 'function') ? options : utils).replace;
  OPTS.jsonquery = ((typeof options.jsonquery === 'function') ? options : utils).jsonquery;
  OPTS.beforeEach = options.beforeEach;
  OPTS.afterEach = options.afterEach;

  return OPTS;
};

exports.options = options;
exports.parseArguments = parseArguments;
