const { exec } = require('child_process');
const { getReqObj } = require('../../utils');

module.exports = function forTC(OPTS, test, fileData, done, noti) {
  const { reqObj, callback } = getReqObj(this, OPTS, test, fileData, done, noti);
  noti(1, 'SYS_COMMAND', reqObj);
  let payl = reqObj.payload;
  if (reqObj.prefix) {
    payl = `${reqObj.prefix} '${reqObj.payload.split("'").join("\\'")}'`;
  }
  exec(payl, reqObj.options, function(er, sto, ste) {
    callback(er, {
      output : sto,
      error : ste
    });
  });
};
