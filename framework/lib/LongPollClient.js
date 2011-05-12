#require('/framework/lib/basics.js')
#require('/framework/lib/Class.js')
#require('/framework/lib/Connection.js')
#require('/framework/lib/Client.js')

LongPollClient = Class('LongPollClient');
LongPollClient.methods({
  /**
   * Given an endpoint url returned by LongPollServer.createConnection
   * (presumably executing on a remote machine), return a Connection
   * object that can be used to send/receive messages on the
   * connection.
   *
   * Returns a connection object immediately. If the connection fails,
   * it will enter the 'disconnected' state.
   *
   * TODO: would be easier for new developers if you called
   * OutboundConnection.create(url) rather than using this factory
   * method (and the LongPollClient would be managed behind the
   * scenes, if it were actually needed)
   *
   * @param url {String} endpoint
   * @return {Connection}
   */
  openConnection: function (url) {
    return OutboundConnection.create(url);
  }
});

// TODO: private
OutboundConnection = Class('OutboundConnection', Connection);
OutboundConnection.constructor(function (_super, url) {
  var self = this;
  _super();
  self.url = url;
  self.initialized = false;
  self.onMessage = null;
  self.onStateChange = null;
  self.send_queue = [];
  self.first_send_serial = 0;
  self.send_in_progress = false;
  self.receive_queue = [];
  self.next_receive_serial = 0;
});
OutboundConnection.methods({
  setHandlers: function (onMessage, onStateChange) {
    // TODO: error if self.initialized === true?
    var self = this;
    self.onMessage = onMessage;
    self.onStateChange = onStateChange;
    self.initialized = true;
    self.receive_queue.forEach(function (m) {
      self.onMessage(m);
    });
    self.receive_queue = [];
    // Don't call _try_receive directly: On some browsers, if an XHR
    // is initiated before the page is done loading (including from
    // the document onload handler), then the browser throbber shows
    // during the XHR.
    setTimeout(function () {self._try_receive();}, 0);
  },
  send: function (message) {
    var self = this;
    self.send_queue.push(message);
    // use setTimeout to allow batching when several messages are sent
    // in a row
    setTimeout(function () {
      self._try_send();
    }, 0);
  },
  _try_send: function () {
    LONG_POLL_SEND_TIMEOUT_MS = 30*1000; // TODO: move elsewhere
    var self = this;
    if (self.send_in_progress || self.send_queue.length === 0)
      return;
    var payload = [self.first_send_serial].concat(self.send_queue);
    var num_sent = self.send_queue.length;
    self.send_in_progress = true;
    var xhr = Client.XMLHttpRequest();
    xhr.open("POST", self.url);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Pragma", "no-cache");
    xhr.setRequestHeader("Cache-Control", "no-cache");
    // TODO: send "Expires: 0" from server (as well as the previous)

    var timeout = setTimeout(function () {self.handler(true);},
        LONG_POLL_SEND_TIMEOUT_MS);
    var handler = function (is_timeout) {
      if (!xhr) // we already ran
        return;
      if (is_timeout)
        xhr.abort();
      else if (xhr.readyState !== 4)
        return;
      self.send_in_progress = false;
      clearTimeout(timeout);
      if (is_timeout || xhr.status !== 200) {
        // TODO: throttle retries
        // TODO: eventually declare disconnected
        // TODO: kill more promptly on non-recoverable server error ...
        // TODO IMPORTANT: right now we can have N of these in flight, and
        // we thrash the server pretty bad. we need to fix this, as part
        // of overhauling the whole retry mechanism.
        setTimeout(function () {
          self._try_send();
        }, 5*1000);
        return;
      }

      self.send_queue.splice(0, num_sent);
      self.first_send_serial += num_sent;
      // Now go deal with any messages that arrived in the meantime
      setTimeout(function () {
        self._try_send();
      }, 0);
      xhr = null;
    };
    // NB: WebKit passes an argument to onreadystatechange
    xhr.onreadystatechange = function () {handler(false);};
    xhr.send(JSON.stringify(payload));
  },
  _try_receive: function () {
    LONG_POLL_RECEIVE_TIMEOUT_MS = 60*1000; // TODO: move elsewhere
    var self = this;
    var xhr = Client.XMLHttpRequest();
    xhr.open("POST", self.url);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Pragma", "no-cache");
    xhr.setRequestHeader("Cache-Control", "no-cache");

    var timeout = setTimeout(function () {self.handler(true);},
        LONG_POLL_RECEIVE_TIMEOUT_MS);
    var handler = function (is_timeout) {
      if (!xhr)
        return;
      if (is_timeout)
        xhr.abort();
      else if (xhr.readyState !== 4)
        return;
      clearTimeout(timeout);

      try {
        var messages = JSON.parse(xhr.responseText);
      } catch (e) {
        messages = undefined;
      }

      if (is_timeout || xhr.status !== 200 || messages === undefined ||
          !(messages instanceof Array)) {
        // This is a genuine error (or our network going away), not
        // just a lack of messages.. since the server is supposed to
        // bounce us at 30sec.
        // TODO: throttle retries
        // TODO: eventually declare disconnected
        // TODO: kill more promptly on non-recoverable server error ...
        setTimeout(function () {
          self._try_receive();
        }, 5*1000);
        return;
      }

      if (self.initialized) {
        messages.forEach(function (m) {
          self.onMessage(m);
        });
      } else {
        messages.forEach(function (m) {
          self.receive_queue.push(m);
        });
      }
      self.next_receive_serial += messages.length;
      self._try_receive();
    };
    // NB: WebKit passes an argument to onreadystatechange
    xhr.onreadystatechange = function () {handler(false);};
    xhr.send(JSON.stringify(self.next_receive_serial));
  },
  setDeathTime: function (timeout_secs) {
    UNIMPLEMENTED();
  }
});
