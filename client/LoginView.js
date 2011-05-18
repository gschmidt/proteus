#require('/framework/lib/Class.js')

LoginView = Class("LoginView");

// loggedin: fired when the user logs in
LoginView.events("loggedin");

/**
 * The main application screen -- shown all of the time, except when
 * the user is not logged in.
 */
LoginView.constructor(function (_super) {
  _super();
  var self = this;
  var container = self.container = DIV();

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

LoginView.methods({
  element: function () {
    var self = this;
    return self.container;
  }
});
