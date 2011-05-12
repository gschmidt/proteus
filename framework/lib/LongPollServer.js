#require('/framework/lib/basics.js')
#require('/framework/lib/Class.js')
#require('/framework/lib/Connection.js')
#require('/framework/lib/Server.js')

// TODO: it'd be really cool if we could have an #export directive
// that rewrites all names except those exported. It'd need to rewrite
// them in a human-readable way for debugging, but in prod it could
// rewrite them arbitrarily.

/**
 * Server half of sequenced, reliable, bidirectional, realtime, JSON
 * streams, over HTTP long polling (for now)
 *
 * The server creates the connection and sends the ID of the
 * connection to the client. The ID is a URL identifying the HTTP
 * server and resource to talk to, with the query string being the
 * connection id (a secret chosen by the server that should be
 * protected as if it were an authentication credential.)
 *
 * All communication happens over that one URL/endpoint, and the
 * method is always POST.
 *
 * Messages in both directions are given sequentially incrementing
 * integer IDs. Each direction gets its own numbering. The first
 * message in each direction has ID 9.
 *
 * To send messages, the client posts [integer, message, message..] to
 * the endpoint. The server returns HTTP 200 to confirm receipt of the
 * messages. The integer is the ID of the first message that follows.
 * This allows the server to discard duplicate messages in the event
 * that it processed a message but the 200 response was lost and the
 * client resent the message.
 *
 * To receive messages, the client posts an integer to the
 * endpoint. This acknowledges receipt of all messages up to but not
 * including the message with that serial, and asks the server to
 * return a JSON list containing all available subsequent messages,
 * blocking until at least one is available or until a timeout is
 * reached (in which case the server should return [].)
 *
 * TODO: maybe we shouldn't put secrets in query strings, and instead
 * put it in the POST body?
 */
LongPollServer = Class('LongPollServer');
LongPollServer.constructor(function (_super, base_url) {
  _super();
  var self = this;
  this.base_url = base_url;
  /// Map<String secret,InboundConnection>
  /// TODO: consider garbage collection ...
  this.connections = {};
});
LongPollServer.methods({
  /**
   * Creates a bidirectional, sequenced, reliable, JSON message
   * stream. Returns an object represents the server half of the
   * connection (which the server may use to send messages to the
   * client, and receive messages from the the client), and a URL that
   * the client can pass to LongPollClient to get an object
   * representing its own, symmetric, half of the connection.
   *
   * @return {[Connection, String]}
   */
  createConnection: function () {
    var self = this;
    var CONNECTION_SECRET_LENGTH = 16; // TODO: move somewhere better?
    var secret = Server.makeSecret(CONNECTION_SECRET_LENGTH);
    var url = this.base_url + "?" + secret;
    var object = InboundConnection.create();
    this.connections[secret] = object;
    return [object, url];
  },

  /**
   * This is the glue that binds the LongPollServer to node.js. Given an
   * incoming request, handle it (receive/send messages and create
   * connections as appropriate.)
   *
   * @param request {node.js http.ServerRequest} A request that has arrived
   *   at our endpoint, for which LongPollServer will now take responsibility.
   * @param response {node.js http.ServerResponse} The response object that
   *   goes with the request
   */
  handleRequest: function (request, response) {
    var self = this;
    var url = require('url');
    var parts = url.parse(request.url);
    var secret = parts.query || '';
    var connection = self.connections[secret];
    if (request.method !== 'POST') {
      require('sys').log('bad method'); // xcxc
      response.writeHead(405); // bad method
      response.end();
    } else if (connection) {
      connection._handleRequest(request, response);
    } else {
      require('sys').log('bad cookie'); // xcxc
      response.writeHead(404,
          "Who are you and what have you done with my momma");
      response.end();
    }
  }
});

// TODO: private
// TODO: handle disconnected state? or not?
InboundConnection = Class('InboundConnection', Connection);
InboundConnection.constructor(function (_super) {
  var self = this;
  _super();
  self.initialized = false;
  self.onMessage = null;
  self.onStateChange = null;
  self.pending_response = null;
  self.pending_response_timeout = null;
  self.send_queue = [];
  self.receive_queue = [];
  self.first_send_serial = 0; // serial number of first element in send_queue
  self.next_receive_serial = 0; // serial number of next message expected
});
InboundConnection.methods({
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
  },
  send: function (message) {
    require('sys').log('queueing a message: ' + message);
    // TODO: impose maximum outgoing buffer length
    var self = this;
    self.send_queue.push(message);
    // Do this on a timeout so that if N messages are sent in a row,
    // they will all be sent in one response
    setTimeout(function () {
      self._flush_send();
    }, 0);
  },
  _flush_send: function () {
    var self = this;
    require('sys').log('_flush_send runs');
    if (self.pending_response) {
      require('sys').log('_flush_send has a pending response');
      self.pending_response.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': 0
      });
      require('sys').log('sending: "' + JSON.stringify(self.send_queue) +'"');
      self.pending_response.end(JSON.stringify(self.send_queue));
      self.pending_response = null;
      clearTimeout(self.pending_response_timeout);
      self.pending_response_timeout = null;
    }
    else
      require('sys').log('_flush_send has to wait');
  },
  setDeathTime: function (timeout_secs) {
    UNIMPLEMENTED();
  },
  _handleRequest: function (req, resp) {
    var self = this;
    var chunks = [];
    req.setEncoding('utf8');
    // TODO: add a timeout
    req.on('data', function (chunk) {
      chunks.push(chunk);
      // TODO: add a maximum buffer size!
    });
    req.on('end', function () {
      var payload;
      try {
        payload = JSON.parse(chunks.join(''));
      } catch (e) {
        require('sys').log('request parse failure');
        resp.writeHead(400); // bad request
        resp.end();
        return;
      }

      // To get messages, the client sends an integer
      if (typeof(payload) === "number") {
        // If they already had a connection waiting for messages, kill
        // the old one.
        if (self.pending_response)
          require('sys').log('bouncing dupe');
        self._flush_send();
        // TODO assert self.pending_response === null

        var next_wanted = payload;
        // acknowledge messages
        var ack_count = next_wanted - self.first_send_serial;
        if (ack_count > self.send_queue.length) {
          // Acking a message not yet sent??
          require('sys').log('ack not yet sent');
          resp.writeHead(400, "Bad serial number");
          resp.end();
          return;
        }
        self.send_queue.splice(0, ack_count);
        self.first_send_serial += ack_count;
        self.pending_response = resp;
        var LONG_POLL_TIMEOUT_MS = 30*1000; // TODO: move elsewhere
        self.pending_response_timeout = setTimeout(function () {
          self._flush_send();
        }, LONG_POLL_TIMEOUT_MS);
        if (self.send_queue.length > 0) {
          self._flush_send();
        }
      }

      // To send messages, the client sends [serial, message, message..]
      else if (payload instanceof Array) {
        // Unpack
        if (payload.length === 0) {
          require('sys').log('bad payload xy');
          resp.writeHead(400);
          resp.end();
          return;
        }
        var serial = payload[0];
        payload.splice(0, 1);
        var messages = payload;

        // Remove already-processed messages
        var duplicates = self.next_receive_serial - serial;
        if (duplicates < 0) {
          // They skipped over some serial numbers
          require('sys').log('skipped serial');
          resp.writeHead(400, "Bad serial number");
          resp.end();
          return;
        }
        messages.splice(0, duplicates);

        // Process
        require('sys').log('process:' + JSON.stringify(messages)); // xcxc
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

        // Acknowledge
        resp.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': 0
        });
        resp.end();
      }

      // Bad message
      else {
        require('sys').log('bad message'); // xcxc
        resp.writeHead(400);
        resp.end();
      }
    });
  }
});
