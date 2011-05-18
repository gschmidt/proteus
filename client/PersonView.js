#require('/framework/lib/Class.js')
#require('/client/PeopleManager.js')

PersonView = Class("PersonView");

PersonView.constructor(function (_super) {
  _super();
  var self = this;
  self.selected = null; // id of currently shown person
  self.pman = ENVIRONMENT.pman;
  self.root = DIV();
  self._repopulate();
});

PersonView.methods({
  element: function () {
    return this.root;
  },

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
    if (person.fbid) {
      var img = IMG({
        src: "http://graph.facebook.com/" + person.fbid + "/picture?type=large"
      });
      $(img).appendTo(self.root);
    }
    var del = $("<input type='button' value='Delete'>");
    $(self.root).append(del);
    var was_selected = self.selected; // small precaution -- close
                                      // button over current selection
    del.click(function () {
      var conf = confirm("Really delete this person? There is no undo!");
      if (conf)
        self.pman.deletePerson(was_selected);
    });

    $("<h2>Facebook id</h2>").appendTo(self.root);
    var idinput = $("<input type='text'>").appendTo(self.root);
    idinput.val(person.fbid || '');
    var save = $("<input type='button' value='Save'>").appendTo(self.root);
    save.click(function () {
      self.pman.updatePerson({id: self.selected, fbid: idinput.val()});
    });
  }
});