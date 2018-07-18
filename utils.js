const jsonpath = require('jsonpath');
const { methods } = require('json2server');
const { replace, request, stringify } = methods;

/**
 * Logger to log the request/command and response
 * @param {String} debug the things to debug
 * @param {String} header header to print before the log
 * @param {Object} data the log data
 */
exports.logger = function logger(test, debug, debugonfail, header, data) {
  let toRet = [];
  if (debug || debugonfail) {
    let qr = [];
    let toDebug = false;
    ((debug ? (debug + ',') : '') + (debugonfail || '')).split(',').forEach((db) => {
      if (db.length){
        let queryVal = exports.jsonquery(data, db);
        if (queryVal !== undefined) {
          qr.push([db, queryVal]);
          toDebug = true;
        }
      }
    });
    if (toDebug) {
      toRet = [header, qr];
      if (debug || debugonfail) {
        test.ARdebuggedFor = (debugonfail && debug) ? 'P' : (debugonfail ? 'F': 'P');
        test.ARdebuggedLogs = (test.ARdebuggedLogs || []).concat([toRet]);
      }
    }
  }
  return toRet;
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
  let res = data;
  if (typeof data === 'object' && data !== null) {
    if (path.indexOf('LEN()<') === 0) {
      return jsonpath.query(data, path.substring(6)).length;
    } else if(typeof path === 'string' && path.indexOf('TYPEOF<') === 0) {
      return (typeof jsonpath.query(data, jpath.substring(7)));
    } else if (path.indexOf('ARRAY<') === 0) {
      return jsonpath.query(data, path.substring(6));
    } else if (path.indexOf('<') === 5) {
      const count = parseInt(path.substr(0, 5), 10);
      if (!isNaN(count)) {
        return jsonpath.query(data, path.substring(6), count);
      }
    }
    res = jsonpath.query(data, path, 1);
    res = (Array.isArray(res) && res.length < 2) ? res[0] : res;
  }
  return res;
};

exports.request = request;
exports.replace = replace;
exports.noop = function() { };
