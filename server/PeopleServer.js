#require('/framework/lib/basics.js')
#require('/framework/lib/Class.js')

PeopleServer = Class('PeopleServer');

PeopleServer.constructor(function (_super, server_session, mongo) {
  _super();
  var self = this;
  self.sess = server_session;
  self.mongo = mongo;

  self.sess.onRpc('people/all', function (env, junk, reply) {
    self.mongo.collection('people', function(err, people) {
      people.find(function(err, cursor) {
        cursor.toArray(function(err, docs) {
          reply(docs);
        });
      });
    });
  });

  self.sess.onRpc('people/new', function (env, person, reply) {
    self.mongo.collection('people', function(err, people) {
      people.insert(person); // XXX should probably check for errors
      self.sess.post('people/new', person);
      reply(true);
    });
  });

  self.sess.onRpc('people/delete', function (env, id, reply) {
    self.mongo.collection('people', function(err, people) {
      var ret = people.remove({_id: id}); // XXX should probably check for errors
      self.sess.post('people/delete', id);
      reply(true);
    });
  });

  self.sess.onRpc('people/update', function (env, details, reply) {
    self.mongo.collection('people', function(err, people) {
      var id = details.id;
      delete details[id];
      people.update({_id: id}, {$set: details});
      details[id] = id;
      self.sess.post('people/update', details); // XXX error checking, etc..
      reply(true);
    });
  });
});


