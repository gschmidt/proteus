#require('/framework/lib/basics.js')
#require('/framework/lib/Class.js')

ServerSession = Class('ServerSession');

ServerSession.constructor(function (_super) {
  var self = this;
  _super();
  self.nextConnId = 0;
  self.conns = {}; // map from connId to conn
  self.handlers = {};
  self.subs = {};
});

// XXX need to audit all of this to prevent a user from, say,
// subscribing to topic with a 100 megabyte name

ServerSession.methods({
  /**
   * Assume responsibility for handling a connection to a new client.
   *
   * @param conn {Connection}
   */
  setupConnection: function (conn) {
    var self = this;
    var connId = self.nextConnId;
    self.nextConnId++;
    self.conns[connId] = conn;
    conn.setHandlers(self._onMessage.bind(self, connId),
                     self._onStateChange.bind(self, connId));
  },

  /**
   * Register a function to handle an rpc. When a client makes an rpc
   * to 'endpoint', then 'handler' will be called with two arguments:
   * first, the 'data' value passed by the client; second, a
   * function. The handler should arrange that the function be called
   * at some point in the future with one argument, the value to
   * return to the client.
   *
   * @param endpoint {String}
   * @param handler {Function<value,Function<value>>}
   */
  onRpc: function (endpoint, handler) {
    var self = this;
    self.handlers[endpoint] = handler;
  },

  /**
   * Post a message to a topic. All clients subscribed to the topic
   * will receive it.
   *
   * @param topic {String}
   * @param message {} Arbitrary JSON-compatible value
   */
  post: function (topic, message) {
    require('sys').log('post ' + message + ' to ' + topic);
    var self = this;
    var subs = self.subs[topic];
    require('sys').log('there are ' + subs.length + ' subs here');
    require('sys').log('subs is ' + subs);
    if (subs) {
      for (connId in subs) {
        require('sys').log('there goes a sub, to connid ' + connId);
        self.conns[connId].send([topic, message]);
      }
    }
  },

  _onMessage: function (connId, message) {
    var self = this;
    var conn = self.conns[connId];
    require('sys').log('onmessage:' + JSON.stringify(message)); // xcxc
    if (typeof(message) !== 'object')
      return;
    else if (typeof(message[0]) === 'number') {
      var rpcid = message[0];
      var endpoint = message[1];
      var data = message[2];
      require('sys').log('it is an rpc');
      if (endpoint in self.handlers) {
        require('sys').log('endpoint found');
        (self.handlers[endpoint])(data, function (result) {
          conn.send([rpcid, result]);
        });
      }
      else {
        // XXX return error for unknown rpc..
      }
    } else if (message[0] === 'sub') {
      var obj = self.subs[message[1]];
      if (obj === undefined)
        obj = self.subs[message[1]] = {};
      obj[connId] = true;
    } else if (message[0] === 'unsub') {
      var obj = self.subs[message[1]];
      if (obj !== undefined)
        delete obj[connId];
    } else {
      // XXX stupid message
    }
  },

  _onStateChange: function (connId, state) {
    var conn = self.conns[connId];
    // XXX
  }
});


