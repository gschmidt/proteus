#require('/framework/lib/Class.js')
#require('/framework/lib/Html.js')

PeopleSearch = Class("PeopleSearch");

/// select: fired when someone select a person.
/// @param id {String} id of the selected person
/// new: fired when they choose to create a new person.
/// @param query {String} the string they entered
PeopleSearch.events("select", "new");

PeopleSearch.constructor(function (_super) {
  _super();
  var self = this;
  self.pman = ENVIRONMENT.pman;
  self.oldSearchValue = null;
  self.currentCompletions = [];
  self.selectedCompletion = null; // id, or "new"

  self.field = INPUT({type: "text", placeholder: "People Search"});
  self.directory = DIV({id: "directory"});
  self.container = DIV({class: "search"}, [
    self.field,
    self.directory
  ]);

  //self.field.focus(); XXX can't do, not in DOM yet
  $(self.container).keydown(function (evt) {
    var moveSelection = function (offset) {
      self._eltForSelection().removeClass('selected');
      var idx = self.currentCompletions.indexOf(self.selectedCompletion);
      idx = (idx + offset + self.currentCompletions.length + 1) %
        (self.currentCompletions.length + 1);
      self.selectedCompletion = self.currentCompletions[idx] || "new";
      self._eltForSelection().addClass('selected');
    };
    if (evt.which === 40) { // down
      moveSelection(1);
      evt.stopPropagation();
      return false;
    } else if (evt.which === 38) { // up
      moveSelection(-1);
      evt.stopPropagation();
      return false;
    } else if (evt.which === 13) { // enter
      if (self.selectedCompletion === "new") {
        self._makePerson();
        return;
      }
      $(self.field).val('');
      self.fire("select", self.selectedCompletion);
    }
  });

  self.pman.on("changed",
               self._drawPeopleList.bind(this, true));
  $(self.field).keyup(self._drawPeopleList.bind(this, false));
  self._drawPeopleList(true);
});

PeopleSearch.methods({
  /// TODO: can we eliminate clearSearch and focus? They are provided
  /// because we want a global key binding on ESC.

  // should we just make this an attribute?
  element: function () {
    var self = this;
    return self.container;
  },

  /// Clear the input box and hide the panel.
  clearSearch: function () {
    var self = this;
    $(self.field).val('');
  },

  /// Focus the search field
  focus: function () {
    var self = this;
    $(self.field).focus();
  },

  _eltForSelection: function () {
    var self = this;
    if (self.selectedCompletion === "new")
      return $('.create-new-person');
    else
      return $('[completion_id="' + self.selectedCompletion + '"]');
  },

  _drawPeopleList: function(force) {
    var self = this;
    var value = $(self.field).val();
    // XXX hide/show should happen on keydown, not keyup, and should fade.
    // the problem with trapping keydown or keypress is that the field
    // value has not yet been updated at that point.
    if (!force && value === self.oldSearchValue)
      return; // since it gets called on every keypress..
    self.oldSearchValue = value;
    if (value.length === 0) {
      $(self.directory).hide();
      return;
    }
    $(self.directory).show();

    // TODO: mouseovers and clickability on the rows
    self.currentCompletions = [];
    var results = DIV({id: "directory-inner"}, [
      UL([
        self.pman.getPeopleMatching(value).map(function (pair) {
          var person = self.pman.getPerson(pair[0]);
          self.currentCompletions.push(pair[0]);
          return LI({completion_id: pair[0]}, [pair[1]]);
        }),
        LI({class: "create-new-person"}, [
          "Add person: " + value
        ])
      ])
    ]);

    $(self.directory).empty();
    $(self.directory).append(results);

    if (self.currentCompletions.indexOf(self.selectedCompletion) === -1)
      self.selectedCompletion = self.currentCompletions[0] || "new";
    self._eltForSelection().addClass('selected');
  },

  _makePerson: function () {
    var self = this;
    var query = $(self.field).val();
    if (query.length === 0)
      return;
    $(self.field).val('');
    self.fire("new", query);
  }

});
