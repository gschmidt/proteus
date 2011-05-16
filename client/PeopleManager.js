#require('/framework/lib/basics.js')

PeopleManager = Class('PeopleManager');

// XXX Probably need a generic observer pattern.

PeopleManager.events("changed");

PeopleManager.constructor(function (_super) {
  _super();
  var self = this;
  self.people = {};
  self.sess = ENVIRONMENT.sess;
  // XXX this is all lame and fake
  self.sess.rpc('people/all', null, function (people) {
    people.forEach(function (p) {
      self.people[p._id] = p;
    });
    self.fire("changed");
  });
  self.sess.subscribe('people/new', function (person) {
    self.people[person._id] = person;
    self.fire("changed");
  });
  self.sess.subscribe('people/delete', function (person) {
    delete self.people[person.id];
    self.fire("changed");
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
      _id: id
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
    var results = {}; // id => em'd string
    var ret = [];

    // TODO: ignore non-alphanumerics
    query = query.replace(/[^a-zA-Z\s]/,'');

    var tryQuery = function (qparts) {
      if (qparts.length === 0)
        return;
      var re = new RegExp();
      var q = "^" + qparts.map(function (x) { return "(.*)\\b(" + x + ")";}).join('') +
        "(.*)$";
      re.compile(q, 'i');
      for (var id in self.people) {
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
          results[id] = decorated;
        }
      }
    }

    // try first as prefixes, then as initials. let initials matches
    // take precedence when highlighting.
    tryQuery(query.split(/\s+/));
    query = query.replace(/\s/,'');
    tryQuery(query.split(''));

    for (var id in results)
      ret.push([id, results[id]]);
    return ret;
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
   * @return {String} the id of the created person
   */
  createPerson: function (options) {
    var self = this;
    var person = extend({}, options);
    person._id = genId();
    self.people[person._id] = person;
    self.sess.rpc('people/new', person);
    self.fire("changed");
    return person._id;
  },

  /**
   * Permanently delete a person.
   *
   * @param id {String} The person to delete
   */
  deletePerson: function (id) {
    var self = this;
    delete self.people[id];
    self.sess.rpc('people/delete', id);
    self.fire("changed");
  }

});
