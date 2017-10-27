const { getOptions } = require('./extractArgs');

const OPTS = {
  fileArray: []
};

exports.init = function init(options) {
  Object.assign(OPTS, getOptions(options));
};

function getDebug(ob, OPTS, vars) {
  return OPTS.replace(ob.details.debug, vars);
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
  if (!fileData[1].details) fileData[1].details = {};
  const mainDebug = getDebug(fileData[1], OPTS, vars);
  Object.keys(vars).forEach((ky) => {
    const nk = OPTS.replace(ky, vars);
    vars[nk] = OPTS.replace(vars[ky], vars);
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
  fileData[1].tests.forEach((test, ind) => {
    if (!test.details) test.details = {};
    if (!OPTS.replace(test.details.disabled, vars) && (!OPTS.steps || OPTS.steps.indexOf(ind) !== -1)) {
      it(OPTS.replace(test.details.summary, vars), function(done) {
        const currDebug = getDebug(test, OPTS, vars);
        require(`./types/${test.valdationType || OPTS.type}`).call(this, OPTS, test, fileData, done, noti.bind(OPTS, getFinalDebug(currDebug, mainDebug, OPTS.debug)));
      });
    }
  });
  OPTS.notifier('POST_TEST_SUITE', fileData, vars, OPTS);
};

exports.start = function start(){
  OPTS.fileArray.forEach((fileData) => {
    const flnm = fileData[0].split('.').shift();
    if (!fileData[1].details.disabled && (!OPTS.file || OPTS.file === flnm)) {
      describe(flnm, function(){
        exports.forTS.call(this, fileData);
      });
    }
  });
};
