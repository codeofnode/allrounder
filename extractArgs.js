const { join, isAbsolute, basename, dirname, sep } = require('path');
const { methods } = require('json2server');
const EventEmitter = require('events');
const { request } = methods;
const cwd = process.cwd();
const os = require('os');
const { readdirSync } = require('fs');
const utils = require('./utils');

const options = { };
const opts = process.argv.slice(2);
const { name, version, description } = require('./package.json');
let parsingDone = false;

function getObjectFromFileOrArgument (inp) {
  if (typeof inp === 'string') {
    if (inp.endsWith('.json') || inp.endsWith('.js')) {
      try {
        return require(getStringValue(inp, true));
      } catch (er) {
      }
    }
    try {
      return require(getStringValue(inp, true)+ '.json');
    } catch (er) {
    }
    try {
      return require(getStringValue(inp, true)+ '.js');
    } catch (er) {
    }
    try {
      return JSON.parse(inp);
    } catch (er) {
      if (inp.indexOf(':') !== -1) {
        return Object.assign(...inp.split(',').map(st => { const sp=st.split(':'); return { [sp[0]]:sp[1] }}))
      }
    }
  }
  return inp;
};

const globalMethods = {
  EVAL: eval
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
  const test = { ARtestIndex : 0 };
  const request = {};
  test.request = request;
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
      test.dbConfig = getObjectFromFileOrArgument(splits[1]);
      if (typeof test.dbConfig === 'string') {
        test.dbConfig = { dbUrl : test.dbConfig };
      }
      if (typeof test.dbConfig.dbUrl !== 'string') throw new Error('A valid connection url is required to connect with database.');
      if (test.dbConfig.dbUrl.indexOf('mongodb') === 0) {
        test.dbConfig.driverName = 'mongodb';
      }
      request.payload = getObjectFromFileOrArgument(splits[2]);
      if (!options.debug) {
        options.debug = 'payload,output,error';
      }
      break;
    default:
      if (splits[1].indexOf('caFile=') === 0) {
        request.caFile = splits[1].substring(7);
        splits.splice(1, 1);
      }
      if (splits[1].indexOf('http2=') === 0) {
        request.http2Options = getObjectFromFileOrArgument(splits[1].substring(6));
        splits.splice(1, 1);
      }
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
    res({ tests: [test] });
  });
}

function parseArguments() {
  let showHelp, ol = opts.length;
  for (let k = 0; k < ol; k++) {
    arg = opts[k];
    if (parsingDone) break;
    if (showHelp === undefined) {
      showHelp = false;
    }
    const ind = arg.indexOf('=');
    const larg = arg.toLowerCase();
    let value = getStringValue(arg.substr(ind+1));
    let key = larg.substr(0, ind) || larg;
    if (key === '-e' || key === '--exec') {
      parseReq(opts.slice(k));
      break;
    }
    if (ind === -1) {
      if (k+1 === ol && !options.file && !options.jsondir) {
        if (arg.endsWith('.json')) {
          key = '-f';
        } else if (!(arg.startsWith('-'))) {
          key = '-j';
        }
      } else {
        if (['-bi','-ib'].indexOf(arg) !== -1) {
          opts.splice(k+1, 0, '-b');
          arg = key = opts[k] = '-i';
          ol++;
        }
        if (['-b','-i', '--insecure', '--bail'].indexOf(arg) === -1) {
          k++;
          value = opts[k];
        } else {
          if (opts[k+1] === '1') k++;
          value = 1
        }
      }
    }
    switch(key){
      case '-f':
      case '--file':
        if (value) {
          options.file = getStringValue(value, true);
        }
        break;
      case '-c':
      case '--conf':
        if (value) {
          options.confs = getStringValue(value, true);
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
      case '--utility':
        if (value){
          const utilityObj = getObjectFromFileOrArgument(value);
          if (typeof utilityObj === 'object') {
            Object.assign(globalMethods, utilityObj);
          }
        }
        break;
      case '-p':
      case '--pipe':
        if (value) {
          resolvePipe(value, options);
        }
        break;
      case '-s':
      case '--srcdir':
        if (value) {
          options.srcdir = getStringValue(value, true);
        }
        break;
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
      case '-w':
      case '--whileinterval':
        if (value){
          const vt = parseInt(value, 10);
          if (!isNaN(vt)) {
            options.whileinterval = vt;
          }
        }
        break;
      case '-n':
      case '--debugonfail':
        if (value){
          options.debugonfail = value;
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
      case '--output':
        if (value){
          options.output = value;
        }
        break;
      case '--speckey':
        if (value){
          options.speckey = value;
        }
        break;
      case '-k':
      case '--stacktrace':
        if (value !== undefined) {
          if (['0', '1', 0, 1].indexOf(value) === -1) {
            options.stacktrace = 1;
            k--;
          } else {
            options.stacktrace = value;
          }
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
  }
  if (showHelp) {
    const optsString = opts.join('');
    if (['-v', '-V', '--version'].indexOf(optsString) !== -1) {
      return 2
    }
  }
  return showHelp;
}

const filesMap = {};
let jsondir = cwd;

function getArp(fn) {
  let fullpath = fn;
  if (fn.indexOf(sep) === -1) fullpath = join(jsondir, fn);
  if (filesMap[fullpath]) return filesMap[fullpath];
  const ar = [fullpath];
  try {
    ar.push(require(fullpath));
  } catch(er) {
    ar.push({ tests : [] });
  }
  try {
    let base = basename(fullpath).split('.');
    base.pop();
    base = base.join('.');
    ar.push(require(join(dirname(fullpath), `${base}.${options.speckey}.js`)));
  } catch(er) {
    ar.push({});
  }
  ar[2] = Object.assign({}, globalMethods, ar[2]);
  ar.push(JSON.stringify(ar[1]));
  filesMap[fullpath] = ar;
  return ar;
}

function getTests(fl) {
  if (!fl.type && fl.require) fl.type = 'unit'
  return fl.tests || fl.testcases || fl.steps || fl.entries || fl.records;
}

function getNthActiveElement(ar, ind, retInd) {
  for(let cn = -1, i = 0, ln = ar.length;i <ln;i++) {
    if (!(ar[i].neg)) {
      cn++;
    }
    if (cn === ind) {
      return retInd ? i : ar[i];
    }
  }
}

function createNewStep(prefixedObject, og, ae) {
  if (typeof ae !== 'object' || ae === null || typeof og !== 'object' || og === null) return ae;
  return Object.assign({}, ae, {
    neg: ae.neg === undefined ? og.neg : ae.neg,
    summary: prefixedObject.summaryPrefix ? prefixedObject.summaryPrefix + ' => ' + (ae.summary || ae.import) : ae.summary,
    require: ae.require || ae.import || prefixedObject.fixRequire,
    condition: ae.condition === undefined ? og.condition : (og.condition ? `(${og.condition}) && (${ae.condition})` : ae.condition),
  })
}

function resolveJson (vars, replace, fa) {
  const fl = fa[1];
  const tests = getTests(fl);
  if (Array.isArray(tests)) {
    let ln = tests.length;
    for (let z = 0; z < ln; z++) {
      const steps = tests[z].steps;
      if (typeof tests[z].import === 'string' && !replace(tests[z].disabled, Object.assign(fl.vars || {}, vars), globalMethods)) {
        const fixRequire = tests[z].require || (fl.type === 'unit' ? tests[z].import : undefined)
        const summaryPrefix = tests[z].summary || tests[z].import
        if (!tests[z].import.endsWith('.json')) {
          tests[z].import += (options.srcdir ? ('.'+options.speckey) : '') + '.json';
        }
        const prefixedObject = { fixRequire, summaryPrefix }
        let arp = getArp(isAbsolute(tests[z].import) ? tests[z].import : join(dirname(fa[0]), tests[z].import));
        let ar = JSON.parse(arp[3]);
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
        const preVars = tests[z].vars;
        if (Array.isArray(ar)) {
          if (steps !== undefined) {
            const art = [];
            if (Array.isArray(steps)) {
              steps.forEach(st => {
                if (typeof st === 'number' && ar[st]) {
                  let toPush = createNewStep(prefixedObject, tests[z], getNthActiveElement(ar, st));
                  if (toPush) art.push(toPush);
                }
              });
            } else if (typeof steps === 'object' && steps !== null
                && (typeof steps.from === 'number' || typeof steps.to === 'number')) {
              let ffrom = getNthActiveElement(ar, steps.from || 0, true);
              let fto = typeof steps.to !== 'number' ? ar.length - 1 : getNthActiveElement(ar, steps.to, true);
              for (let st = ffrom; ar[st] && st <= fto; st++) {
                let toPush = createNewStep(prefixedObject, tests[z], ar[st]);
                if (toPush) art.push(toPush);
              }
            } else if (typeof steps === 'number' && ar[steps]) {
              const toPush = createNewStep(prefixedObject, tests[z], getNthActiveElement(ar, steps));
              if (toPush) art.push(toPush);
            }
            ar = art;
            tests.splice.bind(tests, z, 1).apply(tests, ar);
          } else {
            tests.splice.bind(tests, z, 1).apply(tests, ar.map(createNewStep.bind(null, prefixedObject, tests[z])));
          }
          if (preVars && tests[z]) tests[z].vars = Object.assign(preVars, tests[z].vars);
          ln += ar.length - 1;
          z--;
        }
      }
    }
    tests.forEach((tt,ind) => { tt.ARtestIndex = ind; });
    fl.tests = tests;
  }
}

function afterResolve(fa) {
  getArp(fa[0]).pop();
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
  const readFile = options.confs || join(cwd, 'allrounder.json');
  let read = {};
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

  if ((typeof options.jsondir !== 'string' || !options.jsondir.length)
    && (typeof options.file === 'string' && options.file.length)) {
    options.jsondir = jsondir = dirname(options.file);
  }

  if (typeof options.speckey === 'string' && options.speckey.length) {
    OPTS.speckey = options.speckey;
  } else {
    OPTS.speckey = options.speckey = 'spec';
  }

  if (typeof options.file === 'string' && options.file.length) {
    OPTS.fileArray = [getArp(options.file)];
  } else if (typeof options.jsondir === 'string' && options.jsondir.length) {
    jsondir = options.jsondir;
    OPTS.fileArray = utils.listAllFiles(options.jsondir, 'json').map(getArp);
  } else if (!(options.file instanceof Promise)) {
    if (typeof options.srcdir === 'string' && options.srcdir.length) {
      options.jsondir = jsondir = options.srcdir;
      OPTS.fileArray = utils.listAllFiles(options.srcdir, OPTS.speckey+'.json').map(getArp);
    } else {
      throw new Error('`jsondir` must be present in the options.');
    }
  }

  let vars = {};
  if (typeof options.vars === 'object' && options.vars !== null) {
    vars = options.vars;
  }
  OPTS.replace = ((typeof options.replace === 'function') ? options : utils).replace;

  if (typeof options.jsondir === 'string' && options.jsondir.length) {
    OPTS.fileArray.forEach(resolveJson.bind(null, vars, OPTS.replace));
    OPTS.fileArray.forEach(afterResolve);
  }

  if (String(options.stacktrace) !== '1') {
    OPTS.stacktrace = 0;
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

  if (typeof options.debugonfail === 'string' && options.debugonfail.length) {
    OPTS.debugonfail = options.debugonfail;
  } else {
    OPTS.debugonfail = '';
  }

  if (typeof options.output === 'string' && options.output.length) {
    OPTS.output = getStringValue(options.output, true);
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
  OPTS.jsonquery = ((typeof options.jsonquery === 'function') ? options : utils).jsonquery;
  OPTS.beforeEach = ((typeof options.beforeEach === 'function') ? options : globalMethods).beforeEach;
  OPTS.afterEach = ((typeof options.afterEach === 'function') ? options : globalMethods).afterEach;
  OPTS.beforeEachTest = ((typeof options.beforeEachTest === 'function') ? options : globalMethods).beforeEachTest;
  OPTS.afterEachTest = ((typeof options.afterEachTest === 'function') ? options : globalMethods).afterEachTest;

  return OPTS;
};

exports.options = options;
exports.parseArguments = parseArguments;
