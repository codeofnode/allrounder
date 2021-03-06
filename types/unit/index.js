const { getReqObj } = require('../../commonMethods');
const { join, sep, isAbsolute } = require('path');
const CWD = process.cwd();

const exec = function exec(method, context, payload, construct, isAsync, cb) {
  let ret;
  let prevCb;
  let returnWithCB = false;
  if (isAsync !== false && isAsync !== 1 && typeof payload[payload.length - 1] === 'function') {
    returnWithCB = true;
    prevCb = payload[payload.length - 1];
    payload[payload.length - 1] = function(err) {
      if (err) cb(err);
      else cb(null, Array.prototype.slice.call(arguments, 1))
      return prevCb.apply(undefined, arguments);
    };
  }
  try {
    if (construct) {
      if (payload.length) {
        payload.unshift(null);
        ret = new (Function.prototype.bind.apply(method, payload));
      } else {
        ret = new (Function.prototype.bind.apply(method));
      }
    } else {
      ret = method.apply(context, payload);
    }
  } catch (er) {
    return cb(er);
  }
  if (returnWithCB) return;
  if ((isAsync !== false) && (ret instanceof Promise)) {
    return ret.then(function(res) {
      cb(null, res);
    }).catch(function(rej) {
      cb(rej);
    });
  }
  cb(null, ret);
};

module.exports = function forTC(OPTS, test, fileData, done, noti) {
  const { vars, methods, reqObj, callback } = getReqObj(this, OPTS, test, fileData, done, noti);
  if (!reqObj) return done();
  if (reqObj.params && reqObj.payload === undefined) {
    reqObj.payload = reqObj.params;
    delete reqObj.params;
  }
  noti('UNIT_TEST', reqObj);
  let unit;
  let requi = test.require || fileData[1].require;
  if (!requi && OPTS.srcdir) {
    requi = fileData[0].split('.'+OPTS.speckey + '.json').shift()
  }
  if (requi) {
    const path = OPTS.replace(requi, vars, methods);
    if (typeof path === 'string') {
      if (path === '$global') {
        unit = global;
      } else if (isAbsolute(path)) {
        unit = require(path);
      } else {
        try {
          unit = require(join(OPTS.jsondir, path));
        } catch (er) {
          try {
            unit = require(path);
          } catch (er) {
            unit = path;
          }
        }
      }
    } else {
      unit = path;
    }
  } else {
    unit = global;
  }
  if (typeof reqObj.method !== 'string') return callback({ error: null, output: unit })
  const method = OPTS.jsonquery(unit, OPTS.replace(reqObj.method, vars, methods));
  let payload = (reqObj.payload === undefined) ? [] : OPTS.replace(reqObj.payload, vars, methods);
  if (!Array.isArray(payload)) { payload = [payload]; }
  let context;
  if (reqObj.context) {
    if (typeof reqObj.context === 'object' && reqObj.context !== null
        && reqObj.context.source && reqObj.context.path) {
      context = OPTS.jsonquery(OPTS.replace(reqObj.context.source, vars, methods), OPTS.replace(reqObj.context.path, vars, methods));
    } else {
      context = OPTS.replace(reqObj.context, vars, methods);
    }
  } else {
    context = unit;
  }
  exec(method, context, payload, reqObj.construct, reqObj.async === undefined ? fileData[1].async : reqObj.async, function(error, output) {
    if (typeof reqObj.parser === 'function') {
      try { error = reqObj.parser(error); } catch(er) { }
      try { output = reqObj.parser(output); } catch(er) { }
    }
    callback({ error : error, output: output });
  });
};
