const assert = require('assert');
const { options } = require('./extractArgs');

function postTC(OPTS, vars, methods, test, done, noti, err, resp) {
  const mainResp = err || resp;
  noti('RESPONSE', mainResp);
  extracting(OPTS, test.extractors, vars, methods, mainResp);
  asserting(OPTS, test.assertions, vars, methods, mainResp);
  if (typeof test.asserts === 'object' && test.asserts !== null) {
    let asar = Object.keys(test.asserts);
    let ln = asar.length;
    for (let z = 0; z < ln; z++) {
      asserting(OPTS, test.asserts[asar[z]], vars, methods, OPTS.replace(asar[z], vars, methods));
    }
  }
  options.vars = vars;
  done();
};

exports.getReqObj = function(that, OPTS, test, fileData, done, noti) {
  const vars = fileData[1].vars;
  const methods = fileData[2];
  if (typeof test.vars === 'object' && test.vars !== null) {
    Object.keys(test.vars).forEach((ky) => {
      const nk = OPTS.replace(ky, vars, methods);
      vars[nk] = OPTS.replace(test.vars[ky], vars, methods);
    });
  }
  const input = that.shouldClone ? JSON.parse(JSON.stringify(test.request)) : test.request;
  return {
    reqObj: OPTS.replace(input, vars, methods) || {},
    callback: function callback(err, resp) {
      postTC(OPTS, vars, methods, test, done, noti, err, resp);
    }
  };
};

function asserting(OPTS, block, vars, methods, source) {
  if (typeof block === 'object' && block !== null) {
    let asar = Object.keys(block);
    let ln = asar.length;
    for (let z = 0, key, jpath, exp; z < ln; z++) {
      key = asar[z];
      jpath = OPTS.replace(key, vars, methods);
      exp = OPTS.replace(block[key], vars, methods);
      if (jpath === 'string' && jpath.indexOf('TYPEOF<') === 0) {
        assert.deepEqual(typeof OPTS.jsonquery(source, jpath.subsring(7)), exp);
      } else {
        assert.deepEqual(OPTS.jsonquery(source, jpath), exp);
      }
    }
  }
}

function extracting(OPTS, block, vars, methods, source) {
  if (typeof block === 'object' && block !== null) {
    let asar = Object.keys(block);
    let ln = asar.length;
    for (let z = 0, key, jpath, exp; z < ln; z++) {
      key = asar[z];
      vars[OPTS.replace(key, vars, methods)] = OPTS.jsonquery(source, OPTS.replace(block[key], vars, methods));
    }
  }
}
