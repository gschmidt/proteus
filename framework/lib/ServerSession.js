#require('/framework/lib/basics.js')
#require('/framework/lib/Class.js')

ServerSession = Class('ServerSession');

ServerSession.constructor(function (_super) {
  var self = this;
  _super();
  self.nextConnId = 0;
  self.conns = {}; // map from connId to conn
  self.envs = {}; // map from connId to conn environment
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
    self.envs[connId] = {};
    conn.setHandlers(self._onMessage.bind(self, connId),
                     self._onStateChange.bind(self, connId));
  },

  /**
   * Register a function to handle an rpc. When a client makes an rpc
   * to 'endpoint', then 'handler' will be called with three
   * arguments: first, 'env', which hold arbitrary server-side data
   * about this particular browser frame's session, and may be
   * arbitrarily modified (it begins at {}; second, the 'data' value
   * passed by the client; third, a function. The handler should
   * arrange that the function be called at some point in the future
   * with one argument, the value to return to the client.
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
    var self = this;
    var subs = self.subs[topic];
    if (subs) {
      for (var connId in subs) {
        require('sys').log('there goes a sub, to connid ' + connId);
        self.conns[connId].send([topic, message]);
      }
    }
  },

  _onMessage: function (connId, message) {
    var self = this;
    var conn = self.conns[connId];
    var env = self.envs[connId];
    require('sys').log('onmessage:' + JSON.stringify(message)); // xcxc
    if (typeof(message) !== 'object')
      return;
    else if (typeof(message[0]) === 'number') {
      var rpcid = message[0];
      var endpoint = message[1];
      var data = message[2];
      if (endpoint in self.handlers) {
        (self.handlers[endpoint])(env, data, function (result) {
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


