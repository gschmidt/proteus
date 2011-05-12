// Stuff available only on the client.

// TODO: assert that this is never included on the server (maybe via
// #directive)

Client = {};

/**
 * A portable way to create an XMLHttpRequest object.
 */
Client.XMLHttpRequest = function () {
  if (XMLHttpRequest)
    return new XMLHttpRequest();
  try {
    return new ActiveXObject("Msxml2.XMLHTTP.6.0");
  } catch (e) {}
  try {
    return new ActiveXObject("Msxml2.XMLHTTP.3.0");
  } catch (e) {}
  throw Error("No XMLHttpRequest");
};
