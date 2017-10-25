const jsonpath = require('jsonpath');
const assert = require('assert');
const { methods } = require('json2server');
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

exports.postTC = function(OPTS, vars, test, done, noti, err, resp) {
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
