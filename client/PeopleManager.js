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
   * @return {List<[String, String]>} All of the people that could
   * match, in hopefully some kind of useful order. The first element
   * in each pair is the id of the matching person. The second is
   * their name with <em> tags inserted around the parts that matched
   * the query.
   */
  getPeopleMatching: function (query) {
    var self = this;
    var ret = [];

    var qparts = query.split(/\s+/);
    if (qparts.length === 0)
      return [];
    // TODO: escape/eliminate/ignore non-alphanumerics
    var re = new RegExp();
    var q = "^" + qparts.map(function (x) { return "(.*)\\b(" + x + ")";}).join('') +
      "(.*)$";
    re.compile(q, 'i');

    for (id in self.people) {
      var p = self.people[id];
      var match = re.exec(p.name);
      if (match) {
        var decorated = "";
        var i = 0;
        match.forEach(function (s) {
          i++;
          if (i == 1) return;
          if (i % 2 == 0)
            decorated += s;
          else
            decorated += "<em>" + s + "</em>";
        });
        ret.push([id, decorated]);
      }
    }
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
