const { getOptions } = require('./extractArgs');
const { basename } = require('path');
const { cropString } = require('./utils');
const { URL } = require('url');

const OPTS = {
  fileArray: []
};

exports.init = function init(options, preResolved) {
  if (preResolved) {
    Object.assign(OPTS, options);
  } else {
    Object.assign(OPTS, getOptions(options));
  }
};

function getDebug(ob, debugFor, OPTS, vars, methods) {
  return OPTS.replace(ob[debugFor], vars, methods);
}

function getFinalDebug(tc, ts, main) {
  if (typeof tc === 'string') return tc;
  if (typeof ts === 'string') return ts;
  if (typeof main === 'string') return main;
  return '';
}

function ifConditionFailed(condition){
  if (condition !== undefined) {
    try {
      if (!condition || (typeof condition === 'string' && !eval(condition))) {
        return true;
      }
    } catch (er) {
      return true;
    }
  }
}

function resolveWhile(inputwhile, OPTS, ts){
  if (typeof inputwhile === 'string') {
    return {
      while : inputwhile,
      interval: typeof ts.whileinterval === 'number' ? ts.whileinterval : OPTS.whileinterval
    };
  } else if (typeof inputwhile === 'object' && inputwhile !== null
    && typeof inputwhile.while === 'string' && typeof inputwhile.interval === 'number') {
    return inputwhile;
  }
}

exports.forTS = function forTS(fileData) {
  if (OPTS.timeout) {
    this.timeout(OPTS.timeout);
  }
  let vars = Object.assign({}, fileData[1].vars, OPTS.vars);
  const methods = fileData[2];
  vars.LOOPING_ARRAY = [];
  const resolved = {};
  Object.keys(vars).forEach((ky) => {
    const nk = OPTS.replace(ky, Object.assign({},OPTS.vars,resolved), methods);
    resolved[nk] = OPTS.replace(vars[ky], Object.assign({},OPTS.vars,resolved), methods);
    if (nk !== ky) {
      delete vars[ky];
    }
    vars[nk] = resolved[nk];
  });
  fileData[1].vars = vars;
  const mainDebug = getDebug(fileData[1], 'debug', OPTS, vars, methods);
  const mainDebugOnFail = getDebug(fileData[1], 'debugonfail', OPTS, vars, methods);
  const beforeEachFunction = OPTS.replace(fileData[1].beforeEach, vars, methods);
  if (typeof beforeEachFunction === 'function') {
    beforeEach(beforeEachFunction);
  }
  const afterEachFunction = OPTS.replace(fileData[1].afterEach, vars, methods);
  if (typeof afterEachFunction === 'function') {
    afterEach(afterEachFunction);
  }
  const beforeFunction = OPTS.replace(fileData[1].before, vars, methods);
  if (typeof beforeFunction === 'function') {
    before(beforeFunction);
  }
  const afterFunction = OPTS.replace(fileData[1].after, vars, methods);
  if (typeof afterFunction === 'function') {
    after(afterFunction);
  }
  const ln = fileData[1].tests.length;
  const mochaTS = this;
  function getSummary(test) {
    const summ = test.summary || test.testcase || test.it || test.name;
    return summ
      ? OPTS.replace(summ, vars, methods)
      : test.request
        ? cropString(test.request.url || test.request.payload || 'some unknown test')
        : 'No Summary';
  }
  function runATest(ind, maxInd) {
    if (ind < (maxInd || ln) && ind < ln) {
      const test = fileData[1].tests[ind];
      let batch = 1;
      if (!OPTS.replace(test.disabled, vars, methods) && (!OPTS.steps || OPTS.steps.indexOf(ind) !== -1)) {
        let looping = OPTS.replace(test.looping, vars, methods);
        if (looping === undefined || looping === null || looping) {
          function execTest(that, shouldClone, inde, mochaIndex, looping, done) {
            that.test.ARignoreIfFailed = test.neg;
            that.test.ARtestIndex = test.ARtestIndex;
            vars.$ = inde;
            let sleep = OPTS.replace(test.sleep, vars, methods);
            let tto = OPTS.replace(test.timeout, vars, methods);
            function execNow() {
              vars.$ = inde;
              vars.LOOPING_ARRAY = looping;
              if (ifConditionFailed(OPTS.replace(test.condition, vars, methods))) {
                that.test.ARdisabled = true;
                return done();
              }
              that.ARshouldClone = shouldClone;
              function executing(whileIndex, cb) {
                vars.WHILE_INDEX = whileIndex;
                const currDebug = getDebug(test, 'debug', OPTS, vars, methods);
                const currDebugOnFail = getDebug(test, 'debugonfail', OPTS, vars, methods);
                require(`./types/${test.type || fileData[1].type || OPTS.type}`)
                  .call(that, OPTS, test, fileData, cb, OPTS.logger.bind(OPTS, that.test, getFinalDebug(currDebug, mainDebug, OPTS.debug), getFinalDebug(currDebugOnFail, mainDebugOnFail, OPTS.debugonfail)));
              }
              const resolvedwhile = resolveWhile(test.while, OPTS, fileData[1]);
              if (resolvedwhile) {
                that.ARshouldClone = true;
                function loopingFunction(curIndex){
                  setTimeout(() => {
                    if (ifConditionFailed(OPTS.replace(resolvedwhile.while, vars, methods))) {
                      done();
                    } else {
                      executing(curIndex, loopingFunction.bind(null, curIndex + 1))
                    }
                  }, resolvedwhile.interval);
                }
                loopingFunction(0);
              } else {
                executing(0, done);
              }
            }
            if (typeof sleep !== 'number' || sleep < 1 || isNaN(sleep)) {
              sleep = false;
            }
            if (typeof tto !== 'number' || tto < 1 || isNaN(tto)) {
              tto = false;
            }
            if (sleep) {
              that.timeout(sleep + (tto || OPTS.timeout || 2000));
              setTimeout(execNow, sleep);
            } else {
              if (tto) that.timeout(tto);
              execNow();
            }
          }
          if (maxInd) {
            const nowInd = vars.$;
            const mochaIndex = mochaTS.tests.length - 1;
            it(getSummary(test), function(done) { execTest(this, true, nowInd, mochaIndex, vars.LOOPING_ARRAY, done); });
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
            function forOneLoop(lin) {
              if (lin === looping.length) return;
              vars.$ = lin;
              const shouldClone = batch > 1 || looping.length > 1;
              const mochaIndex = mochaTS.tests.length - 1;
              it(getSummary(test), function(done){ execTest(this, shouldClone, lin, mochaIndex, looping, done); });
              if (batch > 1) {
                runATest(ind + 1, ind + batch);
              }
              forOneLoop(lin + 1);
            };
            forOneLoop(0);
          }
        }
      }
      batch--;
      runATest(ind + batch + 1);
    }
  }
  vars.LOOPING_ARRAY = [];
  runATest(0);
};

exports.start = function start(){
  if (typeof OPTS.debug === 'string' && OPTS.debug.indexOf('unhandledRejection') !== -1) {
    process.on('unhandledRejection', (reason) => {
      console.error('\nUnhandled Rejection. Reason:', reason);
    });
  }
  if (typeof OPTS.beforeEach === 'function') {
    beforeEach(OPTS.beforeEach);
  }
  if (typeof OPTS.afterEach === 'function') {
    afterEach(OPTS.afterEach);
  }
  OPTS.fileArray.forEach((fileData) => {
    const flnm = fileData[0].split('.').shift();
    if (!fileData[1].disabled && (!OPTS.file || basename(OPTS.file) === fileData[0])) {
      describe(fileData[1].testsuite || fileData[1].scenario || flnm, function(){
        exports.forTS.call(this, fileData);
      });
    }
  });
};
