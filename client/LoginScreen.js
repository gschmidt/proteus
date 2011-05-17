#require('/framework/lib/Class.js')

LoginScreen = Class("LoginScreen");

// loggedin: fired when the user logs in
LoginScreen.events("loggedin");

/**
 * The main application screen -- shown all of the time, except when
 * the user is not logged in.
 *
 * @param container {element} The children of this element will be
 *   overwritten with LoginScreen
 */
LoginScreen.constructor(function (_super, container) {
  _super();
  var self = this;
  $(container).empty();

  var d = $('<input type="button" value="Log in with Facebook">');
  d.click(function () {
    // XXX defer until window.fbAsyncInit has fired
    FB.login(function (resp) {
      if (resp.session) {
        self.fire("loggedin");
      } else {
        // they didn't actually log in
      }
    }, {
      perms:'email,offline_access'
    });
  });
  d.appendTo(container);
});