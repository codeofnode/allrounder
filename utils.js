const jsonpath = require('jsonpath');
const assert = require('assert');
const { methods } = require('json2server');
const EventEmitter = require('events');
const { readdirSync } = require('fs');
const { replace, request } = methods;

/**
 * Logger to log the request/command and response
 * @param {Number} debugLevel the level provided as input
 * @param {Number} minLevel minimum level that is required to log
 * @param {String} header header to print before the log
 * @param {Object} data the log data
 */
exports.logger = function logger(debugLevel, minLevel, header, data) {
  if (debugLevel >= minLevel) {
    console.log(`${header} => \n`, data);
  }
};

/**
 * Initialize the testall with various options
 * @param {Object} options the options
 * @param {Boolean} options.rejectUnauthorized whether should reject unauthorized HTTPS, must be set to `false` to reject
 * @param {String} options.jsondir directory where json files resides,
 * @param {Number[]} options.steps Indexes of steps/tests to run
 * @param {Number} options.timeout to set the default timeout
 * @param {String} options.file to validate only one json file
 * @param {String} options.type what kind of validation is it
 * @param {Number} options.debug whether to console all the requests
 * @param {Function} options.logger logger to log the requests and all
 * @param {Function} options.request function to make the http(s) requests
 * @param {Function} options.jsonquery function to make the http(s) requests
 * @param {Object} options.notifier the hooks notifier
 * @param {Function} options.notifier.emit the various hooks functions
 */
exports.init = function init(options) {
  const OPTS = { };
  if (typeof options.jsondir === 'string' && options.jsondir.length) {
    OPTS.fileArray = readdirSync(options.jsondir)
      .filter(fn => fn.endsWith('.json'))
      .map((fn) => {
        const ar = [fn, require(`${__dirname}/jsons/${fn}`)];
        try {
          let base = fn.split('.');
          base.pop();
          base = bas.join('.');
          ar.push(require(`${__dirname}/jsons/${base}`));
        } catch(er) {
          ar.push({});
        }
        return ar;
      });
  } else {
    throw new Error('`jsondir` must be present in the options.');
  }
  if (options.rejectUnauthorized === false) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  if (options.steps && steps.length) {
    OPTS.steps = options.steps;
  }
  if (typeof options.timeout === 'number' && !isNaN(options.timeout)) {
    OPTS.timeout = options.timeout;
  }
  if (typeof options.file === 'string' && options.file.length) {
    OPTS.file = options.file;
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
  OPTS.logger = ((typeof options.logger === 'function') ? options : exports).logger.bind(exports, OPTS.debug);
  OPTS.request = ((typeof options.request === 'function') ? options : exports).request;
  OPTS.replace = ((typeof options.replace === 'function') ? options : exports).replace;
  OPTS.jsonquery = ((typeof options.jsonquery === 'function') ? options : exports).jsonquery;
  if (options.notifier instanceof EventEmitter) {
    OPTS.notifier = options.notifier;
  } else {
    OPTS.notifier = {}
    if (options.notifier && typeof options.notifier.emit === 'function') {
      OPTS.notifier = options.notifier.emit;
    } else {
      OPTS.notifier = exports.noop;
    }
  }
};

exports.jsonquery = function jsonquery(data, path) {
  if (typeof data === 'object' && data !== null) {
    const res = jsonpath.query(data, path);
    return (Array.isArray(res) && res.length < 2) ? res[0] : res;
  } else {
    return data;
  }
};

exports.request = request;
exports.replace = replace;
exports.noop = function() { };

exports.postTC = function(OPTS, test, done, noti, err, resp) {
  const mainResp = err || resp;
  noti(2, 'RESPONSE', mainResp);
  if (typeof test.assertions === 'object' && test.assertions !== null) {
    let asar = Object.keys(test.assertions);
    let ln = asar.length;
    for (let z = 0, key; z < ln; z++) {
      key = asar[z];
      assert.deepEqual(OPTS.replace(test.assertions[key], vars), OPTS.jsonquery(mainResp, OPTS.replace(key, vars)));
    }
  }
  if (typeof test.extractors === 'object' && test.extractors !== null) {
    let asar = Object.keys(test.extractors);
    let ln = asar.length;
    for (let z = 0, key; z < ln; z++) {
      key = asar[z];
      vars[OPTS.replace(key, vars)] = OPTS.jsonquery(mainResp, OPTS.replace(test.extractors[key], vars));
    }
  }
  done();
};
