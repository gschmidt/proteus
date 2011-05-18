#require('/framework/lib/Class.js')

LoginStatusView = Class("LoginStatusView");

LoginStatusView.constructor(function (_super) {
  _super();
  var self = this;
  self.element = DIV({class: 'account'});
  self.fbdata = {};
  FB.api('/me', function (resp) {
    self.fbdata = resp;
    self._update();
  });

/*
  var q = FB.Data.query('select name, uid from user where uid in (select uid2 from friend where uid1 = {0})',
                        FB.getSession().uid);
  q.wait(function (rows) {
    console.log(rows);
  });
*/
});

LoginStatusView.methods({
  _update: function () {
    var self = this;
    $(self.element).empty();

    var logout = A(["Log out"]);
    $(logout).click(function () {
      FB.logout(function (resp) {
        document.location = "/";
      });
    });

    self.element.appendChild(
      DIV([
        DIV([self.fbdata.name]),
        logout
      ])
    );
  }
});
