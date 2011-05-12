#require('/framework/lib/LongPollClient.js')
#require('/framework/lib/ClientSession.js')
#require('/client/PeopleManager.js')
#require('/client/jquery-1.6.js')

$(document).ready(function () {
  var lpc = LongPollClient.create();
  var conn = lpc.openConnection(ENVIRONMENT.connection);
  var sess = ClientSession.create(conn);

  sess.subscribe('reload', function () {
    window.location.reload();
  });

  sess.subscribe('message', function (message) {
    $('body').append('message: ' + JSON.stringify(message) + '<br/>');
  });

  var message = $('<div />');
  message.append("ya ha!!");
  var field = $('<input />').appendTo('body');
  var button = $('<input type="button" value="send it?!" />');
  button.appendTo('body').click(function () {
    $('body').append('you like it<br/>');
    sess.rpc('message', field[0].value);
  });
  $('body').append(message);
});

