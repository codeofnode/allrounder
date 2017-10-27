const assert = require('assert');
const { exec } = require('child_process');
const { createReadStream } = require('fs');
const { postTC } = require('../../utils');

module.exports = function forTC(OPTS, test, fileData, done, noti) {
  const vars = fileData[1].vars;
  if (test.details.timeout) {
    this.timeout(OPTS.replace(test.details.timeout, vars))
  }
  const callback = function callback(err, resp) {
    postTC(OPTS, vars, test, done, noti, err, resp);
  };
  const reqObj = OPTS.replace(test.request, vars);
  switch (OPTS.replace(test.subtype, vars)) {
    case 'db':
      noti(1, 'DB_QUERY', reqObj);
      require(`./dbconnectors/${reqObj.dbName}`)(reqObj, callback);
      break;
    case 'command':
      noti(1, 'SYS_COMMAND', reqObj);
      if (reqObj.prefix) {
        reqObj.payload =
          `${reqObj.prefix} '${reqObj.payload.split("'").join("\\'")}'`;
      }
      exec(reqObj.payload, reqObj.options, function(er, sto, ste) {
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
