
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
    "cursorMethods" : "<Array or object, each can have two properties. 1. method : 'string,<of which cursor have a method>' 2.params: the object/Array/Mixed/absent <that will be passed as parameter to above call> eg { method : 'limit', params : 1 }>"
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
        if (!Array.isArray(query.cursorMethods)) {
          query.cursorMethods = [];
        }
        const cln = query.cursorMethods.length;
        for(let mak, prms, z = 0; z< cln; z++){
          mak = query.cursorMethods[z];
          if(typeof mak === 'string' && typeof cur[mak.method] === 'function') {
            prms = mak.params;
            if(prms !== undefined){
              if(!(Array.isArray(prms))){
                prms = [prms];
              }
            } else {
              prms = [];
            }
            cur = cur[mak.method].apply(cur, prms);
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
