#require('/framework/lib/basics.js')
#require('/framework/lib/Class.js')

// this is trash
var MongoDb = require('../3rdparty/node-mongodb-native/lib/mongodb').Db,
MongoServer = require('../3rdparty/node-mongodb-native/lib/mongodb').Server;

// will be filled in with the mongo collection. disgusting, race-ridden hack
var PEOPLE = null;

var mongo = new MongoDb('proteus', new MongoServer("127.0.0.1", 27017, {}), {});
if(false) {
  var BSON = require("../external-libs/bson/bson");
  mongo.bson_deserializer = BSON;
  mongo.bson_serializer = BSON;
  mongo.pkFactory = BSON.ObjectID;
} else {
  var BSONJS = require('../3rdparty/node-mongodb-native/lib/mongodb/bson/bson');
  mongo.bson_deserializer = BSONJS;
  mongo.bson_serializer = BSONJS;
  mongo.pkFactory = BSONJS.ObjectID;
}

mongo.open(function(err, mongo) {
  mongo.collection('people', function(err, coll) {
    PEOPLE = coll;
  });
});

PeopleServer = Class('PeopleServer');

PeopleServer.constructor(function (_super, server_session) {
  _super();
  var self = this;
  self.sess = server_session;

  self.sess.onRpc('people/all', function (junk, reply) {
    PEOPLE.find(function(err, cursor) {
      cursor.toArray(function(err, docs) {
        reply(docs);
      });
    });
  });

  self.sess.onRpc('people/new', function (person, reply) {
    PEOPLE.insert(person); // XXX should probably check for errors
    self.sess.post('people/new', person);
    reply(true);
  });
});


