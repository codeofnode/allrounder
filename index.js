const { getOptions } = require('./extractArgs');
const { cropString } = require('./utils');
const { URL } = require('url');

const OPTS = {
  fileArray: []
};

exports.init = function init(options) {
  Object.assign(OPTS, getOptions(options));
};

function getDebug(ob, OPTS, vars, methods) {
  return OPTS.replace(ob.debug, vars, methods);
}

function getFinalDebug(tc, ts, main) {
  if (typeof tc === 'string') return tc;
  if (typeof ts === 'string') return ts;
  if (typeof main === 'string') return main;
  return '';
}

exports.forTS = function forTS(fileData) {
  if (OPTS.timeout) {
    this.timeout(OPTS.timeout);
  }
  const vars = fileData[1].vars;
  const methods = fileData[2];
  vars.LOOPING_ARRAY = [];
  const mainDebug = getDebug(fileData[1], OPTS, vars);
  Object.keys(vars).forEach((ky) => {
    const nk = OPTS.replace(ky, vars, methods);
    vars[nk] = OPTS.replace(vars[ky], vars, methods);
    if (nk !== ky) {
      delete vars[ky];
    }
  });
  const noti = function noti(dl, lv, kind, obj) {
    OPTS.logger(dl, kind, obj);
    const pre = lv === 1 ? 'PRE': 'POST';
    OPTS.notifier(`${pre}_TESTCASE`, obj, vars);
    OPTS.notifier(`${pre}_TESTCASE:${kind}`, obj, vars);
  };
  OPTS.notifier('PRE_TEST_SUITE', fileData, vars, OPTS);
  const ln = fileData[1].tests.length;
  function runATest(ind, maxInd) {
    if (ind < (maxInd || ln) && ind < ln) {
      const test = fileData[1].tests[ind];
      function getSummary(){
        return test.summary
          ? OPTS.replace(test.summary, vars, methods)
          : test.request
            ? cropString(test.request.url || test.request.payload || 'some unknown test')
            : 'No Summary';
      }
      let batch = 1;
      if (!OPTS.replace(test.disabled, vars, methods) && (!OPTS.steps || OPTS.steps.indexOf(ind) !== -1)) {
        let looping = OPTS.replace(test.looping, vars, methods);
        if (looping === undefined || looping === null || looping) {
          function execTest(that, shouldClone, inde, looping, done) {
            let sleep = OPTS.replace(test.sleep, vars, methods);
            let tto = OPTS.replace(test.timeout, vars, methods);
            function execNow() {
              vars.$ = inde;
              vars.LOOPING_ARRAY = looping;
              let condition = OPTS.replace(test.condition, vars, methods);
              if (condition !== undefined) {
                if (!condition || (typeof condition === 'string' && !eval(condition))) {
                  return done();
                }
              }
              that.shouldClone = shouldClone;
              const currDebug = getDebug(test, OPTS, vars, methods);
              require(`./types/${test.type || OPTS.type}`)
                .call(that, OPTS, test, fileData, done, noti.bind(OPTS, getFinalDebug(currDebug, mainDebug, OPTS.debug)));
            }
            if (typeof sleep !== 'number' || sleep < 1 || isNaN(sleep)) {
              sleep = false;
            }
            if (typeof tto !== 'number' || tto < 1 || isNaN(tto)) {
              tto = false;
            }
            if (sleep) {
              if (tto || OPTS.timeout) that.timeout(sleep + (tto || OPTS.timeout));
              setTimeout(execNow, sleep);
            } else {
              if (tto) that.timeout(tto);
              execNow();
            }
          }
          if (maxInd) {
            let nowInd = vars.$;
            it(getSummary(), function(done) { execTest(this, true, nowInd, vars.LOOPING_ARRAY, done); });
            return runATest(ind+1, maxInd);
          } else {
            if (typeof looping === 'object' && looping !== null) {
              if (!Array.isArray(looping) && looping.batch) {
                const bth = parseInt(OPTS.replace(looping.batch, vars, methods), 10);
                if (!isNaN(bth) && bth > 0 && bth) {
                  batch = bth;
                }
                looping = OPTS.replace(looping.source, vars, methods);
              }
            }
            looping = (looping === undefined || looping === null || looping);
            if (typeof looping === 'number') looping = Array.apply(null, Array(looping)).map((x, i) => i);
            else if (!Array.isArray(looping)) looping = [looping];
            vars.LOOPING_ARRAY = looping;
            looping.forEach((lp, lin) => {
              vars.$ = lin;
              let shouldClone = batch > 1;
              it(getSummary(), function(done){ execTest(this, shouldClone, lin, looping, done); });
              if (batch > 1) {
                runATest(ind + 1, ind + batch);
              }
            });
          }
        }
      }
      batch--;
      runATest(ind + batch + 1);
    }
  }
  vars.LOOPING_ARRAY = [];
  runATest(0);
  OPTS.notifier('POST_TEST_SUITE', fileData, vars, OPTS);
};

exports.start = function start(){
  OPTS.fileArray.forEach((fileData) => {
    const flnm = fileData[0].split('.').shift();
    if (!fileData[1].disabled && (!OPTS.file || OPTS.file === flnm)) {
      describe(flnm, function(){
        exports.forTS.call(this, fileData);
      });
    }
  });
};
