#require('/framework/lib/Class.js')
#require('/client/PeopleManager.js')

PersonView = Class("PersonView");

PersonView.constructor(function (_super) {
  _super();
  var self = this;
  self.selected = null; // id of currently shown person
  self.pman = ENVIRONMENT.pman;
  self.element = DIV();
  self._repopulate();
});

PersonView.methods({
  switchToPerson: function (id) {
    var self = this;
    self.selected = id;
    self._repopulate();
  },

  _repopulate: function () {
    var self = this;

    $(self.element).empty();
    if (!self.selected) {
      self.element.appendChild(
        SPAN(["Nobody selected"]));
      return;
    }

    var person = self.pman.getPerson(self.selected);
    var was_selected = self.selected; // small precaution -- close
                                      // button over current selection
    var del = INPUT({type: "button", value: "Delete"});
    $(del).click(function () {
      var conf = confirm("Really delete this person? There is no undo!");
      if (conf)
        self.pman.deletePerson(was_selected);
    });

    var idinput = INPUT({type: "text", value: person.fbid || ''});
    var save = INPUT({type: "button", value: "Save"});
    $(save).click(function () {
      self.pman.updatePerson({id: self.selected, fbid: idinput.val()});
    });

    var doc = DIV([
      H1([person.name]),
      DIV([del]),
      person.fbid ?
        IMG({src: "http://graph.facebook.com/" +
             person.fbid + "/picture?type=large"}) :
        [],
      H2(["Facebook id"]),
      idinput,
      save
    ]);
    self.element.appendChild(doc);
  }
});
