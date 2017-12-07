const { getReqObj } = require('../../commonMethods');
const { join, isAbsolute } = require('path');
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
  const { reqObj, callback } = getReqObj(this, OPTS, test, fileData, done, noti);
  if (!reqObj) return done();
  if (reqObj.params && reqObj.payload === undefined) {
    reqObj.payload = reqObj.params;
    delete reqObj.params;
  }
  noti('UNIT_TEST', reqObj);
  const vars = fileData[1].vars;
  const methods = fileData[2];
  let unit;
  const requi = test.require || fileData[1].require;
  if (requi) {
    const path = OPTS.replace(requi, vars, methods);
    if (typeof path === 'string') {
      if (isAbsolute(path)) {
        unit = require(path);
      } else {
        try {
          unit = require(join(OPTS.jsondir || CWD, path));
        } catch (er) {
          unit = path;
        }
      }
    } else {
      unit = path;
    }
  } else {
    unit = global;
  }
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
