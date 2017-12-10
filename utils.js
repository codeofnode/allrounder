const jsonpath = require('jsonpath');
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
  let res = data;
  if (typeof data === 'object' && data !== null) {
    if (path.indexOf('ARRAY<') === 0) {
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
