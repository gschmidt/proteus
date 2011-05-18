#require('/framework/lib/Class.js')
#require('/client/LoginStatusView.js')
#require('/framework/lib/Html.js')

MainScreen = Class("MainScreen");

/**
 * The main application screen -- shown all of the time, except when
 * the user is not logged in.
 *
 * @param container {element} The children of this element will be
 *   overwritten with MainScreen
 */
MainScreen.constructor(function (_super, container) {
  _super();
  var self = this;
  self.pman = ENVIRONMENT.pman;
  $(container).empty();

  var psearch = PeopleSearch.create();
  var login_status_view = LoginStatusView.create();

  var header = DIV({id: "header"}, [
    DIV({class: 'row'}, [
      DIV({class: 'column grid_3'}, [
        DIV({class: 'logo'}, [
          "Monument"
        ])
      ]),
      DIV({class: 'column grid_6'}, [
        psearch.element()
      ]),
      DIV({class: 'column grid_3'}, [
        login_status_view.element()
      ])
    ])
  ]);
  container.appendChild(header);
  psearch.focus();


  var profile = $('<div id="profile"></div>').appendTo(container);
  var pdisplay = PersonDisplay.create($('#profile')[0]);

  psearch.on("select", function (id) {
    pdisplay.switchToPerson(id);
  });

  psearch.on("new", function (name) {
    var id = self.pman.createPerson({
      name: name
    });
    // XXX: Hack. Change contract so that new is a 'hook' (eg, can
    // return a value), and specify that select fires after new.
    this.fire("select", id);
  });

  // somewhere, should register to yank you out of a person's screen
  // if they get deleted? (like that'll ever happen, though..)

  // XXX does this need to be on body?
  $(container).keydown(function (evt) {
    console.log("8*key");
    if (evt.which === 27)  {// esc
      console.log("ITS ESC");
      psearch.clearSearch();
      psearch.focus();
    }
  });
});