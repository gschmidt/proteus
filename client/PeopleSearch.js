#require('/framework/lib/Class.js')

PeopleSearch = Class("PeopleSearch");

/// select: fired when someone select a person.
/// @param id {String} id of the selected person
/// new: fired when they choose to create a new person.
/// @param query {String} the string they entered
PeopleSearch.events("select", "new");

/**
 * @param container {jquery elt set} Div in which elt should be inserted
 *
 * TODO: understand/revise 'container' pattern
 */
PeopleSearch.constructor(function (_super, container) {
  _super();
  var self = this;
  self.pman = ENVIRONMENT.pman;
  self.oldSearchValue = null;
  self.currentCompletions = [];
  self.selectedCompletion = null; // id, or "new"

  self.field = $('<input type=text placeholder="People Search"/>').appendTo(container);
  self.field.focus();
  $('<div id="directory"/>').appendTo(container);
  $('.search').keydown(function (evt) {
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
      self.field.val('');
      self.fire("select", self.selectedCompletion);
    }
  });

  self.pman.on("changed",
               self._drawPeopleList.bind(this, true));
  self.field.keyup(self._drawPeopleList.bind(this, false));
  self._drawPeopleList(true);
});

PeopleSearch.methods({
  /// TODO: can we eliminate clearSearch and focus? They are provided
  /// because we want a global key binding on ESC.

  /// Clear the input box and hide the panel.
  clearSearch: function () {
    var self = this;
    self.field.val('');
  },

  /// Focus the search field
  focus: function () {
    var self = this;
    self.field.focus();
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
    // XXX hide/show should happen on keydown, not keyup, and should fade.
    // the problem with trapping keydown or keypress is that the field
    // value has not yet been updated at that point.
    if (!force && self.field[0].value === self.oldSearchValue)
      return; // since it gets called on every keypress..
    self.oldSearchValue = self.field[0].value;
    if (self.field[0].value.length === 0) {
      $('#directory').hide();
      return;
    }
    $('#directory').show();
    var html = "<div id='directory-inner'><ul>";
    self.currentCompletions = [];
    // TODO: mouseovers and clickability on the rows
    self.pman.getPeopleMatching(self.field[0].value).forEach(function (pair) {
      var person = self.pman.getPerson(pair[0]);
      html += "<li completion_id='" + pair[0] + "'>" + pair[1] + "</li>";
      self.currentCompletions.push(pair[0]);
    });
    html += "<li class='create-new-person'>Add person: " +
      self.field[0].value + "</li>";
    html += "</ul></div>";
    $('#directory').html(html);
    if (self.currentCompletions.indexOf(self.selectedCompletion) === -1)
      self.selectedCompletion = self.currentCompletions[0] || "new";
    self._eltForSelection().addClass('selected');
  },

  _makePerson: function () {
    var self = this;
    var query = self.field[0].value;
    if (query.length === 0)
      return;
    self.field.val('');
    self.fire("new", query);
  }

});
