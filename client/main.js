#require('/framework/lib/LongPollClient.js')
#require('/framework/lib/ClientSession.js')
#require('/client/PeopleManager.js')
#require('/client/PeopleSearch.js')
#require('/client/PersonDisplay.js')
#require('/client/MainScreen.js')
#require('/client/LoginScreen.js')
#require('/client/jquery-1.6.js')

$(document).ready(function () {
  /// Facebook stuff ///
  // FB requires a 'fb-root' div to exist
  var fbroot = document.createElement('div');
  fbroot.id = "fb-root";
  document.body.appendChild(fbroot);

  var fbscript = document.createElement('script');
  fbscript.async = true;
  fbscript.src = document.location.protocol +
    '//connect.facebook.net/en_US/all.js';
  fbroot.appendChild(fbscript);
  // When Facebook is ready, it will call window.fbAsyncInit

  /// rest of app ///

  // XXX we're going to need to defer this until after we're logged
  // in..
  var lpc = LongPollClient.create();
  var conn = lpc.openConnection(ENVIRONMENT.connection);
  /// TODO: find a better way to manage singletons/dependencies
  var sess = ClientSession.create(conn);
  ENVIRONMENT.sess = sess;
  var pman = PeopleManager.create();
  ENVIRONMENT.pman = pman;

  sess.subscribe('reload', function () {
    window.location.reload();
  });

  window.fbAsyncInit = function () {
    FB.init({
      // XXX move to environment? definitely condition on prod vs
      // debug
      appId: 120418858040881,
      status: true,
      cookie: true,
      xfmbl: true
    });

    var approot = $('<div>');
    approot.appendTo('body');

    FB.getLoginStatus(function (resp) {
      if (resp.session) {
        // already logged in
        MainScreen.create(approot[0]);
        // XXX testing -- need to do this on all paths, obviously
        // (actually, it's that we need to not drive the screen
        // transition on FB login as opposed to Proteus login)
        sess.rpc('login/login', {
          method: "fb",
          fbid: resp.session.uid,
          access_token: resp.session.access_token
        }, function (x) {
          console.log("Result of proteus login is: " + x);
        });
      } else {
        var login = LoginScreen.create(approot[0]);
        login.on("loggedin", function () {
          // XXX an example of a memory leak: we need to destroy LoginScreen somehow..
          MainScreen.create(approot[0]);
        });
      }
    });

  };

});

