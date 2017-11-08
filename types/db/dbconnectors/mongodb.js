
const { MongoClient, ObjectId } = require('mongodb');

/*
 * sample input for vars
{
  "dbName": "mongodb",
  "connectionName": "mongodb1",
  "dbConfig": {
    "url": "mongodb://localhost/colormaster",
    "options": {
      "connection": "options"
    }
  },
  "paylaod" :{
    "collection" : "<Collection Name>",
    "command" : "<function to call, eg findOne, find, remove, update etc>",
    "args" : "<Array or object as parameters object passed into db query, eg [{ "$where" : "blah blah" },{ $set : { setIt : true } }]>",
    "cursorMethods" : "Object map of method to arguments, use null if no arguments to be passed eg {"skip": 1 }>"
  }
}
*/

const connectionMap = {};

module.exports = function mongodb(vars, next) {
  function afterConnection(ert, con) {
    if (!connectionMap.hasOwnProperty(vars.connectionName)) {
      connectionMap[vars.connectionName] = con;
    }
    const query = vars.payload;
    if(ert) {
      next({ message : ert.message || ert, status : 400 });
    } else {
      let col;
      try { col = con.collection(query && query.collection); } catch(erm){ }
      if (!col){
        return next({message : "Collection not available", code : 'COL_NOT_AVL', status : 400 });
      }
      if (typeof col[query.command] !== 'function'){
        query.command = 'find';
      }
      let cur;
      try {
        cur = col[query.command].apply(col, query.args);
      } catch(er){
        return next({ message : (er.message || er), status : 400 });
      }
      const callback = function(er,rs){
        if(er) {
          next({ message : er.message || er, status : 400 });
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
          next({ message : 'Invalid cursor calls.', status : 400 });
        }
      } else {
        next({ message : '`command` must return a promise or cursor.', status : 400 });
      }
    }
  };
  if (connectionMap.hasOwnProperty(vars.connectionName)) {
    afterConnection(null, connectionMap[vars.connectionName]);
  } else {
    MongoClient.connect(vars.dbConfig.url, vars.dbConfig.options, afterConnection);
  }
};
