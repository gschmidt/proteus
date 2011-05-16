#require('/framework/lib/basics.js')
#require('/framework/lib/Class.js')

ClientSession = Class('ClientSession');

/**
 * @param conn {Connection}
 */
ClientSession.constructor(function (_super, conn) {
  var self = this;
  _super();
  self.conn = conn;
  self.nextRpcId = 0;
  self.rpcs = {};
  self.subs = {};
  self.conn.setHandlers(self._onMessage.bind(self),
                        self._onStateChange.bind(self));
});

ClientSession.methods({
  /**
   * Perform an RPC and receive a result asynchronously.
   *
   * @param endpoint {String} A short string naming the RPC to invoke.
   * @param data An arbitrary JSON-serializable value to pass as the
   *   RPC's argument. Typically an object, but up to you.
   * @param callback {Function} Function to call when the RPC
   *   completes. It will receive a single argument: either the value
   *   returned by server (same deal as before, any JSON-serializable
   *   value), or undefined if the RPC failed. (Which doesn't imply the
   *   server doesn't think it succeeded..)
   */
  rpc: function (endpoint, data, callback) {
    var self = this;
    self.conn.send([self.nextRpcId, endpoint, data]);
    self.rpcs[self.nextRpcId] = callback;
    self.nextRpcId++;
  },

  /**
   * Subscribe to messages on a particular named topic. Message
   * topics are reliable and sequenced, or at least as much as
   * anything is in this crazy world.
   *
   * @param topic {String} Name of the topic to subscribe to
   * @param callback {Function} Function that will be called when a
   *   message arrives on the topic (with a single argument: the
   *   message, which will typically be an object, but can be an
   *   arbitrary JSON-compatible value)
   */
  subscribe: function (topic, callback) {
    var self = this;
    if (topic in self.subs)
      self.subs[topic].push(callback);
    else {
      self.subs[topic] = [callback];
      self.conn.send(['sub', topic]);
    }
  },

  /**
   * Does what you would reasonably expect
   */
  unsubscribe: function (topic, callback) {
    var self = this, anyleft;
    var subs = self.subs[topic];
    if (!subs)
      return;
    // O(n), but I don't expect a ton of duplicative subs
    var idx = subs.indexOf(callback);
    if (idx !== -1)
      subs.splice(idx, 1);
    if (subs.length === 0)
      self.conn.send(['unsub', topic]);
  },

  _onMessage: function (message) {
    var self = this, callback;
    if (typeof(message) !== 'object')
      return;
    else if (message[0] in self.rpcs) {
      callback = self.rpcs[message[0]];
      delete self.rpcs[message[0]];
      if (callback)
        callback(message[1]);
    } else if (message[0] in self.subs) {
      self.subs[message[0]].forEach(function (cb) {
        cb(message[1]);
      });
    }
  },

  // 'connected', 'disconnected', 'dead'
  _onStateChange: function (state) {
    // XXX fail rpcs when the connection is lost.. maybe reconnect
    // subscriptions when re-established (with a discontinuity message
    // perhaps?)
  }
});


