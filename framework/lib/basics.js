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
mapProperties = function (obj, f) {
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
