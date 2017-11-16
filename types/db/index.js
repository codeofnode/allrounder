const { getReqObj } = require('../../commonMethods');

module.exports = function forTC(OPTS, test, fileData, done, noti) {
  const { reqObj, callback } = getReqObj(this, OPTS, test, fileData, done, noti);
  noti(1, 'DB_QUERY', reqObj);
  require(`./dbconnectors/${reqObj.dbName}`)(reqObj, callback);
};
