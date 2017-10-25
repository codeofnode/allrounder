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
  if (test.request) {
    const reqObj = OPTS.replace(test.request, vars);
    if (typeof reqObj.payloadStream === 'string') {
      reqObj.payloadStream = createReadStream(reqObj.payloadStream);
    }
    noti(1, 'REQUEST', reqObj);
    OPTS.request(reqObj, callback);
  } else if (test.command) {
    const cmdObj = OPTS.replace(test.command, vars);
    noti(1, 'SYS_COMMAND', cmdObj);
    if (cmdObj.prefix) {
      cmdObj.exec = `${cmdObj.prefix} '${cmdObj.exec.split("'").join("\\'")}'`;
    }
    exec(cmdObj.exec, cmdObj.options, function(er, sto, ste) {
      callback(er, {
        stoutput : sto,
        sterror : ste
      });
    });
  } else if (test.dbQuery && test.dbQuery.dbName) {
    const dbQuery = OPTS.replace(test.dbQuery, vars);
    noti(1, 'DB_QUERY', dbQuery);
    require(`./dbconnectors/${dbQuery.dbName}`)(test.dbQuery, callback);
  } else {
    assert(1, 'Dummy test case');
    done();
  }
};
