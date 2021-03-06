const { exec } = require('child_process');
const { getReqObj } = require('../../commonMethods');

module.exports = function forTC(OPTS, test, fileData, done, noti) {
  const { reqObj, callback } = getReqObj(this, OPTS, test, fileData, done, noti);
  noti('SYS_COMMAND', reqObj);
  let payl = reqObj.payload;
  if (reqObj.prefix) {
    payl = `${reqObj.prefix} '${reqObj.payload.split("'").join("\\'")}'`;
  }
  exec(payl, reqObj.options, function(er, sto, ste) {
    if (typeof reqObj.parser === 'function') {
      try { sto = reqObj.parser(sto); } catch(er) { }
      try { ste = reqObj.parser(ste); } catch(er) { }
    }
    callback(er, {
      output : sto,
      error : ste
    });
  });
};
