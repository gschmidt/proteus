#require('/framework/lib/basics.js')

PeopleManager = Class('PeopleManager');

// XXX Probably need a generic observer pattern.

PeopleManager.constructor(function (_super) {
  _super();
  var self = this;
  self.people = {};
  self.sess = ENVIRONMENT.sess;
  self.callbacks = [];
  // XXX this is all lame and fake
  self.sess.rpc('people/all', null, function (people) {
    extend(self.people, people);
    self._notify();
  });
  self.sess.subscribe('people/new', function (person) {
    self.people[person.id] = person;
    self._notify();
  });
});

PeopleManager.methods({
  /**
   * @param id {String} The person to get
   * @return {Object} All available person information
   */
  getPerson: function (id) {
    var self = this;
    if (id in self.people)
      return self.people[id];
    else return {
      id: id,
      name: "Mr. " + id
    };
  },
  /**
   * @param query {String} Partially typed name
   * @return {List<String>} Id's of all people that could match, in
   *   order of relevance
   */
  getPeopleMatching: function (query) {
    var self = this;
    var ret = [];
    for (p in self.people)
      ret.push(p);
    return ret; // super lame, of course
  },
  onPeopleChanged: function (cb) {
    var self = this;
    // XXX breaks GC, very bad. I think?
    self.callbacks.push(cb);
  },
  _notify: function() {
    var self = this;
    self.callbacks.forEach(function (cb) {
      cb();
    });
  },

  /**
   * Create a new person (durably, on the server)
   *
   * For attributes, see schema. Do not include an id.
   *
   * XXX: error handling (probably some unified "shit happened, your
   * stuff wasn't saved" mechanism)
   *
   * @param options {Object} Attributes for the new person
   */
  createPerson: function (options) {
    var self = this;
    var person = extend({}, options);
    person.id = genId();
    self.people[person.id] = person;
    self.sess.rpc('people/new', person);
    self._notify();
  }
});
