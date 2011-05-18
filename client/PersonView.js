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
    $(self.element).empty();
    self._repopulate();
  },

  _repopulate: function () {
    var self = this;
    if (!self.selected) {
      $(self.element).html("Nobody selected");
      return;
    }
    var person = self.pman.getPerson(self.selected);
    $(self.element).html("<h1>" + person.name + "</h1>"); // XXX escaping
    if (person.fbid) {
      var img = IMG({
        src: "http://graph.facebook.com/" + person.fbid + "/picture?type=large"
      });
      $(img).appendTo(self.element);
    }
    var del = $("<input type='button' value='Delete'>");
    $(self.element).append(del);
    var was_selected = self.selected; // small precaution -- close
                                      // button over current selection
    del.click(function () {
      var conf = confirm("Really delete this person? There is no undo!");
      if (conf)
        self.pman.deletePerson(was_selected);
    });

    $("<h2>Facebook id</h2>").appendTo(self.element);
    var idinput = $("<input type='text'>").appendTo(self.element);
    idinput.val(person.fbid || '');
    var save = $("<input type='button' value='Save'>").appendTo(self.element);
    save.click(function () {
      self.pman.updatePerson({id: self.selected, fbid: idinput.val()});
    });
  }
});
