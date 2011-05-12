#require('/framework/lib/LongPollClient.js')
#require('/client/jquery-1.4.4.js')

var onMessage = function (message) {
  if (message === 'reload') {
    window.location.reload();
    return;
  }
  $('body').append('message: ' + JSON.stringify(message) + '<br/>');
};

var onStateChange = function () {
  $('body').append('state change?<br/>');
};

$(document).ready(function () {
  var lpc = LongPollClient.create();
  var conn = lpc.openConnection(ENVIRONMENT.connection);
  conn.setHandlers(onMessage, onStateChange);

  var message = $('<div />');
  message.append("ya ha!!");
  var field = $('<input />').appendTo('body');
  var button = $('<input type="button" value="send it?!" />');
  button.appendTo('body').click(function () {
    $('body').append('you like it<br/>');
    conn.send(field[0].value);
  });
  $('body').append(message);
});

