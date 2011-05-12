// Stuff available only on the server.

// TODO: assert that this is never included on the client (maybe via
// #directive)

Server = {};

/**
 * Return a string of 'length' randomly-chosed base64 characters, for
 * use as a cryptographic secret.
 *
 * @param length {Integer}
 * @return {String}
 */
Server.makeSecret = function (length) {
  var fs = require('fs');
  var fd = fs.openSync('/dev/urandom', 'r');
  var byte_length = Math.ceil(length*6/8);
  var buffer = new Buffer(byte_length);
  var count = fs.readSync(fd, buffer, 0, byte_length, null);
  return buffer.toString('base64').substr(0, length);
};
