/***
 * A convenient way to create DOM elements.
 *
 * DIV({class: "mydiv", style: "color: blue;"}, [
 *   "Some text",
 *   A({href: "/some/location"}, ["A link"]),
 *   DIV({class: "emptydiv"}),
 *   // if an object is inserted, the value of its 'element'
 *   // attribute will be used
 *   myView,
 *   DIV([
 *     "Both the attributes and the contents are optional",
 *     ["Lists", "are", "flattened"]
 *   })
 * ]);
 */

// XXX find a place to document the contract for *View classes -- they
// should have an attribute named 'element'

// All HTML4 elements, excluding deprecated element
// http://www.w3.org/TR/html4/index/elements.html
// also excluding the following elements that seem unlikely to be used in the body:
// HEAD, HTML, LINK, MAP, META, NOFRAMES, NOSCRIPT, SCRIPT, STYLE, TITLE
('A ABBR ACRONYM B BDO BIG BLOCKQUOTE BR BUTTON CAPTION CITE CODE COL ' +
 'COLGROUP DD DEL DFN DIV DL DT EM FIELDSET FORM H1 H2 H3 H4 H5 H6 HR ' +
 'I IFRAME IMG INPUT INS KBD LABEL LEGEND LI OBJECT OL OPTGROUP OPTION ' +
 'P PARAM PRE Q S SAMP SELECT SMALL SPAN STRIKE STRONG SUB SUP TABLE TBODY ' +
 'TD TEXTAREA TFOOT TH THEAD TR TT U UL VAR').split(' ').forEach(
   function (tag) {
     window[tag] = function (arg1, arg2) {
       var attrs, contents;
       if (arg2) {
         attrs = arg1;
         contents = arg2;
       } else {
         if (arg1 instanceof Array) {
           attrs = {};
           contents = arg1;
         } else {
           attrs = arg1;
           contents = [];
         }
       }
       var elt = document.createElement(tag);
       for (var a in attrs)
         elt.setAttribute(a, attrs[a]);
       var addChildren = function (children) {
         children.forEach(function (c) {
           if (c instanceof Array)
             addChildren(c);
           else if (typeof(c) === "string")
             elt.appendChild(document.createTextNode(c));
           else if ('element' in c)
             addChildren([c.element]);
           else
             elt.appendChild(c);
         });
       };
       addChildren(contents);
       return elt;
     };
   });
