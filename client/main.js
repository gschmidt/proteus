#require('/framework/lib/LongPollClient.js')
#require('/framework/lib/ClientSession.js')
#require('/client/PeopleManager.js')
#require('/client/jquery-1.6.js')

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

  var field = $('<input />').appendTo(search);
  var button = $('<input type="button" value="create by name" />');
  var makeperson = function () {
    if (field[0].value.length > 0) {
      pman.createPerson({
        name: field[0].value
      });
      field.val('');
    }
  };
  button.appendTo('body').click(makeperson);
  field.keydown(function (evt) {
    if (evt.which === 13) // enter
      makeperson();
  });
  field.focus();
  $('<div id="directory"/>').appendTo(search);

  var pman = PeopleManager.create();
  var drawPeopleList = function() {
    // XXX hide/show should happen on keydown, not keyup, and should fade
    if (field[0].value.length === 0) {
      $('#directory').hide();
      return;
    }
    $('#directory').show();
    var html = "<div id='directory-inner'><ul>";
    pman.getPeopleMatching(field[0].value).forEach(function (pair) {
      var person = pman.getPerson(pair[0]);
      html += "<li>" + pair[1] + "</li>";
    });
    html += "</ul></div>";
    $('#directory').html(html);
  };
  pman.onPeopleChanged(drawPeopleList);
  field.keyup(drawPeopleList);
  drawPeopleList();
});

