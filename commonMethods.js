const assert = require('assert');
const { options } = require('./extractArgs');

function postTC(OPTS, vars, methods, test, noti, err, resp) {
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
  const input = that.ARshouldClone ? JSON.parse(JSON.stringify(test.request)) : test.request;
  const beforeFunction = OPTS.replace(test.before, vars, methods);
  if (typeof beforeFunction === 'function') beforeFunction.call(that, vars, methods, null, null, OPTS, test, done);
  return {
    vars,
    methods,
    reqObj: OPTS.replace(input, vars, methods) || {},
    callback: function callback(err, resp) {
      postTC(OPTS, vars, methods, test, noti, err, resp);
      const afterFunction = OPTS.replace(test.after, vars, methods);
      if (typeof afterFunction === 'function') afterFunction.call(that, vars, methods, err, resp, OPTS, test, done);
      done();
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
      if (typeof exp === 'object' && !Array.isArray(exp) && exp !== null
          && (typeof exp.assertFunction === 'function' || (typeof exp.assertMethod === 'string' && exp.assertMethod.length))) {
        if (typeof exp.assertFunction === 'function') {
          exp.assertFunction(OPTS.jsonquery(source, jpath), exp.assertExpectedValue, source, exp, vars, methods);
        } else {
          assert[exp.assertMethod](OPTS.jsonquery(source, jpath), exp.assertExpectedValue);
        }
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
