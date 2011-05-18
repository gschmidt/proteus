#require('/framework/lib/Class.js')
#require('/client/LoginStatusView.js')
#require('/framework/lib/Html.js')
#require('/client/PeopleSearchView.js')
#require('/client/PersonView.js')

MainView = Class("MainView");

/**
 * The main application screen -- shown all of the time, except when
 * the user is not logged in.
 */
MainView.constructor(function (_super) {
  _super();
  var self = this;
  self.pman = ENVIRONMENT.pman;
  self.element = DIV();

  var psearch = PeopleSearchView.create();
  var login_status_view = LoginStatusView.create();
  var pdisplay = PersonView.create();

  var header = DIV({id: "header"}, [
    DIV({class: 'row'}, [
      DIV({class: 'column grid_3'}, [
        DIV({class: 'logo'}, [
          "Monument"
        ])
      ]),
      DIV({class: 'column grid_6'}, [
        psearch
      ]),
      DIV({class: 'column grid_3'}, [
        login_status_view
      ])
    ])
  ]);
  self.element.appendChild(header);
  psearch.focus();

  var pdisplay = PersonView.create($('#profile')[0]);
  self.element.appendChild(pdisplay.element);

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
  $(self.element).keydown(function (evt) {
    if (evt.which === 27)  {// esc
      psearch.clearSearch();
      psearch.focus();
    }
  });
});
