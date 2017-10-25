const assert = require('assert');
const { postTC } = require('../../utils');

const OPTS = {
  fileArray: []
};

exports.init = function init(options) {
  Object.assign(OPTS, init(options));
};

let todoMethodsForReplace = true;
let preRep;

module.exports = function forTC(OPTS, test, fileData, done, noti) {
  const vars = fileData[1].vars;
  if (todoMethodsForReplace) {
    todoMethodsForReplace = false;
    preRep = OPTS.replace;
    OPTS.replace = function(source, vrs) {
      return preRep(source, vrs, methods);
    };
  }
  if (test.details.timeout) {
    this.timeout(OPTS.replace(test.details.timeout, vars));
  }
  const callback = function callback(err, resp) {
    postTC(OPTS, vars, test, done, noti, err, resp);
  };
  let unit;
  try { unit = require(OPTS.replace(test.require, vars)); } catch (er) { }
  const ln = test.assertions.length;
  const errors = new Array(ln);
  const outputs = new Array(ln);
  function forOneAssertion(ind){
    if (ind === ln) return callback(null, { errors: errors, outputs: outputs });
    let context;
    let source;
    if (ass.context) {
      context = OPTS.jsonquery(ass.context.global ? global : unit, OPTS.replace(ass.context.path, vars));
    } else {
      context = global;
    }
    if (ass.global) {
      source = global;
    } else {
      source = unit;
    }
    if (ass.method) {
      const method = OPTS.jsonquery(source, OPTS.replace(ass.method, vars));
      if (typeof method !== 'function') {
        throw new Error(`${ass.method}: Not a function`);
      }
      let params = [];
      if (ass.params !== undefined) {
        params = OPTS.replace(Array.isArray(ass.params) ? ass.params : [ass.params], vars);
      }
      const output = method.apply(context, params);
      const asar = Object.keys(ass.checks);
      const ln = asar.length;
      if (ass.async && output instanceof Promise) {
        output.then(function(res) {
          outputs[ind] = res;
          forOneAssertion(ind + 1);
        }).catch(function(rej) {
          errors[ind] = rej;
          forOneAssertion(ind + 1);
        });
      } else {
        outputs[ind] = output;
        forOneAssertion(ind + 1);
      }
    } else {
      outputs[ind] = output;
      forOneAssertion(ind + 1);
    }
  };
  forOneAssertion(0);
};
