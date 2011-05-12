#require('/framework/lib/Class.js')

/**
 * Abstract base class: a connection that can pass reliable, sequenced
 * JSON messages in realtime.
 */
Connection = Class('Connection');
Connection.methods({
  /**
   * Set the handlers for this connection. Messages are queued up
   * until handlers are set (or maybe the connection isn't even opened
   * until then.)
   *
   * @param onMessage {Function} Called to deliver a message
   * @param onStateChange {String} Called to report that the
   *   connection has entered a new state: 'connected' (all is well
   *   and messages seem to be flowing), 'disconnected' (the
   *   connection has gone away, but we're continually retrying, for
   *   hours or days potentially), 'dead' (the connection has been
   *   'disconnected' for longer than the timeout set with
   *   setDeathTime and should be regarded as irrevocably dead)
   */
  setHandlers: null,
  /**
   * Send a message
   *
   * @param message {Object} JSON-serializable object to send
   */
  send: null,
  /**
   * If a connection remains disconnected for this amount of time,
   * then it is moved to the dead state and resources associated with
   * it are free. Should be set on the server to enable GC of dead
   * connections.
   *
   * @param timeout {Number} Number of seconds to wait
   */
  setDeathTime: null
});
