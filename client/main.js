#require('/framework/lib/LongPollClient.js')
#require('/framework/lib/ClientSession.js')
#require('/client/PeopleManager.js')
#require('/client/PeopleSearch.js')
#require('/client/jquery-1.6.js')

$(document).ready(function () {
  var lpc = LongPollClient.create();
  var conn = lpc.openConnection(ENVIRONMENT.connection);
  /// TODO: find a better way to manage singletons/dependencies
  var sess = ClientSession.create(conn);
  ENVIRONMENT.sess = sess;
  var pman = PeopleManager.create();
  ENVIRONMENT.pman = pman;

  sess.subscribe('reload', function () {
    window.location.reload();
  });

  var header = $('<div id="header" />').appendTo('body');
  header.html('<div class="row"><div class="column grid_3"><div class="logo">Monument</div></div><div class="column grid_6"><div class="search"> </div></div><div class="column grid_3"><div class="account">You\'re logged in as you</div></div></div>');

  var profile = $('<div id="profile" />').appendTo('body');

  var psearch = PeopleSearch.create($('#header .search')[0]);

  psearch.on("select", function (id) {
    // XXX move into profile display controller..
    var person = pman.getPerson(id);
    profile.html("<h1>" + person.name + "</h1>"); // XXX escaping
    var del = $("<input type='button' value='Delete'>");
    profile.append(del);
    del.click(function () {
      var conf = confirm("Really delete this person? There is no undo!");
      if (conf)
        pman.deletePerson(id);
    });
  });

  psearch.on("new", function (name) {
    var id = pman.createPerson({
      name: name
    });
    // XXX: Hack. Change contract so that new is 'hook' (eg, can
    // return a value), and specify that select fires after new.
    this.fire("select", id);
  });

  // somewhere, should register to yank you out of a person's screen
  // if they get deleted? (like that'll ever happen, though..)

  $('body').keydown(function (evt) {
    if (evt.which === 27)  {// esc
      psearch.clearSearch();
      psearch.focus();
    }
  });
});

