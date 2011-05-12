// TODO: forEach works this way on client, but not server? Probably
// Mochi is to blame? And it has the opposite signature as in some
// libraries?


var makeButton = function(text, handler) {
    var elt = document.createElement('button');
    elt.type = 'button';
    elt.innerHTML = text;
    elt.addEventListener('click', handler, false);
    return elt;
};

var appendMessage = function(message) {
    var elt = document.createElement("div");
    elt.innerHTML = message
    document.body.appendChild(elt);
};

var hello = function() {
    document.body.appendChild(makeButton("dummy rpc", sendMessage));
    document.body.appendChild(makeButton("post event", postEvent));
    longPollLoop();
};
window.addEventListener('load', hello, false);

var handleResult = function(obj) {
    var animal = obj.kitten;
    forEach(obj.frequencies, function (f) {
        appendMessage(animal + " times " + f);
    });
};

var sendMessage = function() {
    var d = doXHR('/rpc', {
        method: 'POST',
        sendContent: {kitten: 'cute'},
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    });
    d.addCallback(function (result) {
        // TODO deal with parse failure ...
        handleResult(JSON.parse(result.responseText));
    });
    d.addErrback(function (result) {
        alert("failure in sendMessage");
    });
};

var postEvent = function() {
    var d = doXHR('/post_event', {
        method: 'POST'
    });
    d.addCallback(function (result) {
        // all good
    });
    d.addErrback(function (result) {
        alert("failure in postEvent");
    });
};

var handleEvents = function(events) {
    forEach(events, function(e) {
        appendMessage("Flavor of this event: " + e.flavor);
    });
};

var longPollLoop = function(obj) {
    appendMessage("starting a longpoll");
    // Provide some random crap in the query string. Otherwise, in
    // Chrome at least, if you have multiple windows open, only the
    // first request for a give URL is placed immediately, and the
    // other ones wait in line..
    var d = doXHR('/events?' + Math.random(), {
        method: 'GET'
    });
    d.addCallback(function (result) {
        appendMessage("longPollLoop came back ..");
        // TODO deal with parse failure ...
        handleEvents(JSON.parse(result.responseText));
        setTimeout(longPollLoop, 0);
    });
    d.addErrback(function (result) {
        alert("failure in longPollLoop - ending polling!");
    });
};
