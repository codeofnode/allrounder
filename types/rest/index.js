const assert = require('assert');
const { exec } = require('child_process');
const { createReadStream } = require('fs');
const { postTC } = require('../../utils');

module.exports = function forTC(OPTS, test, fileData, done, noti) {
  const vars = fileData[1].vars;
  const methods = fileData[2];
  if (test.details.timeout) {
    this.timeout(OPTS.replace(test.details.timeout, vars, methods));
  }
  const callback = function callback(err, resp) {
    postTC(OPTS, vars, methods, test, done, noti, err, resp);
  };
  const input = this.shouldClone ? JSON.parse(JSON.stringify(test.request)) : test.request;
  const reqObj = OPTS.replace(input, vars, methods);
  switch (OPTS.replace(test.subtype, vars, methods)) {
    case 'db':
      noti(1, 'DB_QUERY', reqObj);
      require(`./dbconnectors/${reqObj.dbName}`)(reqObj, callback);
      break;
    case 'command':
      noti(1, 'SYS_COMMAND', reqObj);
      let payl = reqObj.payload;
      if (reqObj.prefix) {
        payl = `${reqObj.prefix} '${reqObj.payload.split("'").join("\\'")}'`;
      }
      exec(payl, reqObj.options, function(er, sto, ste) {
        callback(er, {
          stoutput : sto,
          sterror : ste
        });
      });
      break;
    default:
      noti(1, 'REQUEST', reqObj);
      if (typeof reqObj.payloadStream === 'string') {
        reqObj.payloadStream = createReadStream(reqObj.payloadStream);
      }
      OPTS.request(reqObj, callback);
  }
};
