#require('/framework/lib/Class.js')
#require('/client/PeopleManager.js')

PersonDisplay = Class("PersonDisplay");

PersonDisplay.constructor(function (_super, container) {
  _super();
  var self = this;
  self.selected = null; // id of currently shown person
  self.pman = ENVIRONMENT.pman;
  self.root = ($('<div/>').appendTo(container))[0];
  self._repopulate();
});

PersonDisplay.methods({
  switchToPerson: function (id) {
    var self = this;
    self.selected = id;
    $(self.root).empty();
    self._repopulate();
  },

  _repopulate: function () {
    var self = this;
    if (!self.selected) {
      $(self.root).html("Nobody selected");
      return;
    }
    var person = self.pman.getPerson(self.selected);
    $(self.root).html("<h1>" + person.name + "</h1>"); // XXX escaping
    var del = $("<input type='button' value='Delete'>");
    $(self.root).append(del);
    var was_selected = self.selected; // small precaution -- close
                                      // button over current selection
    del.click(function () {
      var conf = confirm("Really delete this person? There is no undo!");
      if (conf)
        self.pman.deletePerson(was_selected);
    });
  }
});
