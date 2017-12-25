const { getReqObj } = require('../../commonMethods');

module.exports = function forTC(OPTS, test, fileData, done, noti) {
  const { reqObj, callback, vars, methods } = getReqObj(this, OPTS, test, fileData, done, noti);
  test.dbConfig = OPTS.replace(test.dbConfig, vars, methods);
  if (typeof test.dbConfig.connectionName !== 'string') test.dbConfig.connectionName = 'db';
  noti('DB_QUERY', reqObj);
  require(`./dbconnectors/${test.dbConfig.driverName}`)(reqObj, test.dbConfig, callback);
};
