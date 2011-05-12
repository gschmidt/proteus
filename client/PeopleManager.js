#require('/framework/lib/basics.js')

PeopleManager = Class('PeopleManager');

PeopleManager.methods({
  /**
   * @param id {String} The person to get
   * @return {Object} All available person information
   */
  getPerson: function (id) {
    if (id in this.people)
      return this.people[id];
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
    return [];
  }
});

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
PeopleManager.createPerson = function (options) {
  var person = extend({}, options);
  person.id = genId();
  this.people[id] = person;
  this.lpc.send(['createPerson', person]);
};



/**
 * @param lpc {LongPollClient}
 */
PeopleManager.constructor(function (_super, lpc) {
  _super();
  this.people = {};
  this.lpc = lpc;
});
