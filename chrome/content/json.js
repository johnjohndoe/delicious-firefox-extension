//We will use native nsIJSON

var YBJSON = {
  nativeJSON: Components.classes["@mozilla.org/dom/json;1"]
                 .createInstance(Components.interfaces.nsIJSON),
  parse: function(jsonString) {
    return this.nativeJSON.decode(jsonString);
  },
  stringify: function(jsonObject) {
    return this.nativeJSON.encode(jsonObject);
  }
};