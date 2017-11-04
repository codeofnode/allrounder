const { createReadStream } = require('fs');
const { getReqObj } = require('../../utils');

module.exports = function forTC(OPTS, test, fileData, done, noti) {
  const { reqObj, callback } = getReqObj(this, OPTS, test, fileData, done, noti);
  noti(1, 'REQUEST', reqObj);
  if (typeof reqObj.payloadStream === 'string') {
    reqObj.payloadStream = createReadStream(reqObj.payloadStream);
  }
  OPTS.request(reqObj, callback);
};
