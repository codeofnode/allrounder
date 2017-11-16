const assert = require('assert');
const { options } = require('./extractArgs');

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
  if (typeof test.vars === 'object' && test.vars !== null) {
    Object.assign(vars, OPTS.replace(test.vars, vars, methods))
  }
  options.vars = vars;
  done();
};
