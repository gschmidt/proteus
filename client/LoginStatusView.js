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

/*
    var img = $("<img>");
    img[0].src = "http://graph.facebook.com/" + self.fbdata.id + "/picture?type=square";
    $(img).appendTo(self.element);
*/
    $("<div>").text(self.fbdata.name).
      appendTo(self.element);
    $("<a>").text("Log out").click(function () {
      FB.logout(function (resp) {
        document.location = "/";
      });
    }).appendTo(self.element);

  }
});
