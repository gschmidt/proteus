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

  var pman = PeopleManager.create();
  var drawPeopleList = function() {
    var html = "<ul>";
    pman.getPeopleMatching('').forEach(function (pid) {
      var person = pman.getPerson(pid);
      html += "<li>" + person.name + "</li>";
    });
    html += "</ul>";
    $('#directory').html(html);
  };
  pman.onPeopleChanged(drawPeopleList);
  drawPeopleList();

  var field = $('<input />').appendTo('body');
  var button = $('<input type="button" value="create by name" />');
  button.appendTo('body').click(function () {
    pman.createPerson({
      name: field[0].value
    });
  });
  $('<div id="directory"/>').appendTo('body');
});

