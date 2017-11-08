const jsonpath = require('jsonpath');
const assert = require('assert');
const { methods } = require('json2server');
const { replace, request, stringify } = methods;

/**
 * Logger to log the request/command and response
 * @param {String} debug the things to debug
 * @param {String} header header to print before the log
 * @param {Object} data the log data
 */
exports.logger = function logger(debug, header, data) {
  if (debug) {
    const hdr = ` ==> ${header}`;
    let qr = '';
    let toDebug = false;
    debug.split(',').forEach((db) => {
      let queryVal = exports.jsonquery(data, db);
      if (queryVal !== undefined) {
        qr += `${db} => \n${stringify(queryVal, true)}\n`;
        toDebug = true;
      }
    });
    if (toDebug) {
      console.log(hdr);
      console.log(qr);
    }
  }
};

exports.cropString = function cropString(str, ln = 100) {
  const st = stringify(str);
  if (st.length > ln) {
    return st.substring(0, ln-4) + ' ...';
  } else {
    return st;
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

exports.getReqObj = function(that, OPTS, test, fileData, done, noti) {
  const vars = fileData[1].vars;
  const methods = fileData[2];
  const input = that.shouldClone ? JSON.parse(JSON.stringify(test.request)) : test.request;
  return {
    reqObj: OPTS.replace(input, vars, methods),
    callback: function callback(err, resp) {
      exports.postTC(OPTS, vars, methods, test, done, noti, err, resp);
    }
  };
};

exports.postTC = function(OPTS, vars, methods, test, done, noti, err, resp) {
  const mainResp = err || resp;
  noti(2, 'RESPONSE', mainResp);
  if (typeof test.assertions === 'object' && test.assertions !== null) {
    let asar = Object.keys(test.assertions);
    let ln = asar.length;
    for (let z = 0, key; z < ln; z++) {
      key = asar[z];
      assert.deepEqual(OPTS.jsonquery(mainResp, OPTS.replace(key, vars, methods)), OPTS.replace(test.assertions[key], vars, methods));
    }
  }
  if (typeof test.extractors === 'object' && test.extractors !== null) {
    let asar = Object.keys(test.extractors);
    let ln = asar.length;
    for (let z = 0, key; z < ln; z++) {
      key = asar[z];
      vars[OPTS.replace(key, vars, methods)] = OPTS.jsonquery(mainResp, OPTS.replace(test.extractors[key], vars, methods));
    }
  }
  done();
};
