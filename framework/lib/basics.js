#require('/framework/lib/md5.js')

UNIMPLEMENTED = function () {
  throw new Error("Unimplemented");
};

if (!Array.prototype.map) {
  Array.prototype.map = function (f) {
    var len = this.length;
    var ret = new Array(len);
    for (i = 0; i < len; i++)
      ret[i] = f(this[i]);
    return ret;
  };
}

// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
if (!Function.prototype.bind) {
  Function.prototype.bind = function( obj ) {
    var slice = [].slice,
      args = slice.call(arguments, 1),
      self = this,
      nop = function () {},
      bound = function () {
        return self.apply(this instanceof nop ? this : ( obj || {} ),
                          args.concat( slice.call(arguments) ) );
      };
    nop.prototype = self.prototype;
    bound.prototype = new nop();
    return bound;
  };
}

// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(searchElement /*, fromIndex */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (len === 0)
      return -1;

    var n = 0;
    if (arguments.length > 0)
    {
      n = Number(arguments[1]);
      if (n !== n) // shortcut for verifying if it's NaN
        n = 0;
      else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }

    if (n >= len)
      return -1;

    var k = n >= 0
          ? n
          : Math.max(len - Math.abs(n), 0);

    for (; k < len; k++)
    {
      if (k in t && t[k] === searchElement)
        return k;
    }
    return -1;
  };
}


/**
 * For each enumerable property of obj (that is set on obj directly,
 * not inherited from prototype), call f(key, value), where key is the
 * name of the property and value is its value. Return an array
 * containing the result of the invocations.
 *
 * @param obj {Object}
 * @param f {Function(String, *): *}
 * @return {Array<*>}
 */
var mapProperties = function (obj, f) {
  var ret = [];
  for (prop in obj) {
    if (obj.hasOwnProperty(prop))
      ret.push(f(prop, obj[prop]));
  }
  return ret;
}

/// Make a (VM-wide) globally unique value that looks good in a
/// debugger. Cf Lisp 'intern'
/// @param name {String} human-readable string for debugging
var makeSymbol = function (name) {
  return [ name ];
};


/// Return an id that is likely to be universally unique. This is
/// definitely not the way to get a compact id, but it'll do for now.
///
/// XXX find a way to generate more compact ids. either have the
/// client generate temporary ids and keep an alias table for the
/// duration of the session (based on the actual id the server
/// picked), or have the server allocate blocks of id space to us
var __genId_counter = 0;
var genId = function () {
  var key = (__genId_counter++) + "#";
  key += (new Date()).getTime() + "#";
  key += Math.random() + "#";
  key += Math.random() + "#";
  key += Math.random() + "#";
  var id = MD5(key);
  console.log(id);
  return id;
};

/// Copy all of the keys from 'options' onto 'base'.
var extend = function(base, options) {
  for (key in options)
    base[key] = options[key];
  return base;
};
