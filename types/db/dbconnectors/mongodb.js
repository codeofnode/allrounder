
// Supporting Mongo DB : ^3.0.1

let MongoModule, MongoClient, ObjectId;

function resolveMongoDriver (driverPath) {
  if (!MongoModule) {
    if (!driverPath){
      try {
        MongoModule = require('mongodb');
      } catch (er) {
      }
    }
    if (!MongoModule){
      MongoModule = require(driverPath);
    }
    MongoClient = MongoModule.MongoClient;
    ObjectId = MongoModule.ObjectId;
  }
}

/*
 * sample input for reqObj
{
  "paylaod" :{
    "collection" : "<Collection Name>",
    "command" : "<function to call, eg findOne, find, remove, update etc>",
    "args" : "<Array or object as parameters object passed into db query, eg [{ "$where" : "blah blah" },{ $set : { setIt : true } }]>",
    "cursorMethods" : "Object map of method to arguments, use null if no arguments to be passed eg {"skip": 1 }>"
  }
}
*/

/*
 * sample input for dbConfig
{
  "dbConfig": {
    "driverName": "mongodb",
    "driverPath" : "/path/to/mongodb/driver",
    "connectionName": "mongodb1",
    "dbUrl": "mongodb://localhost",
    "dbName": "mydb",
    "options": {
      "connection": "options"
    }
  }
}
*/


const connectionMap = {};

module.exports = function mongodb(reqObj, dbConfig, next) {
  resolveMongoDriver(dbConfig.driverPath);
  function afterConnection(ert, con) {
    if(ert || !con) {
      next({ error : ert.message || ert || "connection failure", status : 400 });
    } else {
      const db = con.db(dbConfig.dbName || dbConfig.dbUrl.split('?').shift().split('/').pop());
      if (!connectionMap.hasOwnProperty(dbConfig.connectionName)) {
        connectionMap[dbConfig.connectionName] = con;
      }
      const query = reqObj.payload;
      let col;
      try { col = db.collection(query && query.collection); } catch(erm){ }
      if (!col){
        return next({error : "Collection not available", code : 'COL_NOT_AVL', status : 400 });
      }
      if (typeof col[query.command] !== 'function'){
        query.command = 'find';
      }
      let cur;
      if (query.args === undefined) query.args = [];
      if (!Array.isArray(query.args)) {
        query.args = [query.args];
      }
      try {
        cur = col[query.command].apply(col, query.args);
      } catch(er){
        return next({ error : (er.message || er), status : 400 });
      }
      const callback = function(er, rs){
        if(er) {
          next({ error : er.message || er, status : 400 });
        } else {
          next({ output : rs, status : 200 });
        }
      };
      if(cur instanceof Promise){
        cur.then(callback.bind(null,null)).catch(callback.bind(null));
      } else if(typeof cur.toArray === 'function'){
        if (typeof query.cursorMethods === 'object' && query.cursorMethods !== null) {
          const kys = Object.keys(query.cursorMethods);
          const kln = kys.length;
          for(let prms, z = 0; z < kln; z++){
            if (typeof cur[kys[z]] === 'function') {
              prms = query.cursorMethods[kys[z]];
              if(prms !== null){
                if(!(Array.isArray(prms))){
                  prms = [prms];
                }
              } else {
                prms = [];
              }
              cur = cur[kys[z]].apply(cur, prms);
            }
          }
        }
        if(cur && typeof cur.toArray === 'function'){
          cur.toArray(callback);
        } else {
          next({ error : 'Invalid cursor calls.', status : 400 });
        }
      } else {
        next({ error : '`command` must return a promise or cursor.', status : 400 });
      }
    }
  };
  if (connectionMap.hasOwnProperty(dbConfig.connectionName)) {
    afterConnection(null, connectionMap[dbConfig.connectionName]);
  } else {
    MongoClient.connect(dbConfig.dbUrl, dbConfig.options, afterConnection);
  }
};
