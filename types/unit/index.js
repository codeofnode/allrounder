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
    ret = new (Function.prototype.bind.apply(method, payload));
  } else {
    ret = method.apply(context, payload);
  }
  if (returnWithCB) return;
  if (isAsync !== false) {
    if (ret instanceof Promise) {
      return ret.then(function(res) {
        cb(null, res);
      }).catch(function(rej) {
        cb(rej);
      });
    }
  }
  cb(null, ret);
};

module.exports = function forTC(OPTS, test, fileData, done, noti) {
  const { reqObj, callback } = getReqObj(this, OPTS, test, fileData, done, noti);
  noti(1, 'UNIT_TEST', reqObj);
  if (!reqObj) return done();
  const vars = fileData[1].vars;
  const methods = fileData[2];
  let unit;
  const requi = reqObj.require || fileData[1].require;
  if (requi) {
    const path = OPTS.replace(requi, vars, methods);
    if (isAbsolute(path)) {
      unit = require(path);
    } else {
      unit = require(join(OPTS.jsondir || CWD, path));
    }
  } else {
    unit = global;
  }
  const method = OPTS.jsonquery(unit, OPTS.replace(reqObj.method, vars, methods));
  const payload = (reqObj.payload === undefined) ? [] : OPTS.replace(reqObj.paylaod, vars, methods);
  if (!Array.isArray(payload)) { payload = [payload]; }
  let context;
  if (reqObj.context) {
    context = OPTS.jsonquery(reqObj.context.global ? global : unit, OPTS.replace(reqObj.context.path || reqObj.context, vars, methods));
  } else {
    context = global;
  }
  exec(method, context, payload, reqObj.construct, reqObj.async === undefined ? fileData[1].async : reqObj.async, function(error, output) {
    if (typeof reqObj.parser === 'function') {
      try { error = reqObj.parser(error); } catch(er) { }
      try { output = reqObj.parser(output); } catch(er) { }
    }
    callback({ error : error, output: output });
  });
};
