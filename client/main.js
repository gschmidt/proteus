#require('/framework/lib/LongPollClient.js')
#require('/framework/lib/ClientSession.js')
#require('/client/PeopleManager.js')
#require('/client/jquery-1.6.js')

// XXX move into a controller of some kind
var selectedCompletion = null; // id, or "new"
var currentCompletions = []; // list of id
var oldSearchValue = null;

var eltForSelection = function () {
  if (selectedCompletion === "new")
    return $('.create-new-person');
  else
    return $('[completion_id="' + selectedCompletion + '"]');
};

$(document).ready(function () {
  var lpc = LongPollClient.create();
  var conn = lpc.openConnection(ENVIRONMENT.connection);
  var sess = ClientSession.create(conn);
  ENVIRONMENT.sess = sess;

  sess.subscribe('reload', function () {
    window.location.reload();
  });

  var header = $('<div id="header" />').appendTo('body');
  header.html('<div class="row"><div class="column grid_3"><div class="logo">Monument</div></div><div class="column grid_6"><div class="search"> </div></div><div class="column grid_3"><div class="account">You\'re logged in as you</div></div></div>');
  var search = $('#header .search')[0];

  var field = $('<input type=text placeholder="People Search"/>').appendTo(search);
  field.focus();
  $('<div id="directory"/>').appendTo(search);
  $('.search').keydown(function (evt) {
    var moveSelection = function (offset) {
      eltForSelection().removeClass('selected');
      var idx = currentCompletions.indexOf(selectedCompletion);
      idx = (idx + offset + currentCompletions.length + 1) %
        (currentCompletions.length + 1);
      selectedCompletion = currentCompletions[idx] || "new";
      eltForSelection().addClass('selected');
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
      if (selectedCompletion === "new") {
        makePerson();
        return;
      }
      field.val('');
      switchToPerson(selectedCompletion);
    }
  });

  var profile = $('<div id="profile" />').appendTo('body');

  var makePerson = function () {
    var id;
    if (field[0].value.length > 0) {
      id = pman.createPerson({
        name: field[0].value
      });
      field.val('');
      switchToPerson(id);
    }
  };
  var switchToPerson = function (id) {
    var person = pman.getPerson(id);
    profile.html("<h1>" + person.name + "</h1>"); // XXX escaping
    var del = $("<input type='button' value='Delete'>");
    profile.append(del);
    del.click(function () {
      var conf = confirm("Really delete this person? There is no undo!");
      if (conf)
        pman.deletePerson(id);
    });
  };

  var pman = PeopleManager.create();
  var drawPeopleList = function(force) {
    // XXX hide/show should happen on keydown, not keyup, and should fade.
    // the problem with trapping keydown or keypress is that the field
    // value has not yet been updated at that point.
    if (!force && field[0].value === oldSearchValue)
      return; // since it gets called on every keypress..
    oldSearchValue = field[0].value;
    if (field[0].value.length === 0) {
      $('#directory').hide();
      return;
    }
    $('#directory').show();
    var html = "<div id='directory-inner'><ul>";
    currentCompletions = [];
    // TODO: mouseovers and clickability on the rows
    pman.getPeopleMatching(field[0].value).forEach(function (pair) {
      var person = pman.getPerson(pair[0]);
      html += "<li completion_id='" + pair[0] + "'>" + pair[1] + "</li>";
      currentCompletions.push(pair[0]);
    });
    html += "<li class='create-new-person'>Add person: " +
      field[0].value + "</li>";
    html += "</ul></div>";
    $('#directory').html(html);
    if (currentCompletions.indexOf(selectedCompletion) === -1)
      selectedCompletion = currentCompletions[0] || "new";
    eltForSelection().addClass('selected');
  };

  pman.on("changed", drawPeopleList.bind(null, true));
  // somewhere, should register to yank you out of a person's screen
  // if they get deleted? (like that'll ever happen, though..)

  field.keyup(drawPeopleList.bind(null, false));
  drawPeopleList();

  $('body').keydown(function (evt) {
    if (evt.which === 27)  {// esc
      field.val('');
      field.focus();
    }
  });

});

