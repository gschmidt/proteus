#require('/framework/lib/basics.js')
#require('/framework/lib/Class.js')

LoginServer = Class('LoginServer');

// XXX move
// XXX make it take the query string as an object
// callback gets (http status code, data, headers)
// you receive undefined for the status code if something goes wrong,
// for example a JSON parse error
// XXX call the callback with undefined status if the HTTP request
// itself fails
// XXX don't pass options blindly (clean up, eg, https)
var restRpc = function (options, callback) {
  var driver = require(options.https ? 'https' : 'http');
  var result = '';
  var req = driver.request(options, function (res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      result += chunk;
    });
    res.on('end', function () {
      var data = undefined;
      var status = res.statusCode;
      try {
        data = JSON.parse(result)
      } catch (e) {
        status = undefined;
      }
      if (status)
        callback(status, data, res.headers);
      else
        callback();
    });
  });
  req.on('error', function () {
    callback();
  });
  req.end();
};

LoginServer.constructor(function (_super, server_session, mongo) {
  _super();
  var self = this;
  self.sess = server_session;
  self.mongo = mongo;

  // XXX because we're doing this, we need to use https to talk
  // between our client and server. at least to send the access tokens
  // around.
  // XXX we don't even know if this will work, eg access_tokens might
  // be IP-locked.
  self.sess.onRpc('login/login', function (env, args, reply) {
    if (args.method === "fb" && args.fbid && args.access_token) {
      // args.fbid, args.access_token
      restRpc({
        host: "graph.facebook.com",
        method: "GET",
        path: "me?access_token=" + args.access_token,
        https: true
      }, function (status, data, headers) {
        if (status && data.id === args.fbid) {
          self.mongo.collection('people', function (err, people) {
            // XXX add an index on fbid, when I figure out how
            var q = {fbid: args.fbid}
            people.find(q, function (err, cursor) {
              cursor.toArray(function (err, results) {
                if (results.length === 1) {
                  env.user = results[0].id;
                  reply(env.user);
                } else
                  reply(false);
              });
            });
          });
        } else
          reply(false);
      });
    } else
      reply(false);
  });

  self.sess.onRpc('logout/logout', function (env, args, reply) {
    env.user = undefined;
    reply(true);
  });
});