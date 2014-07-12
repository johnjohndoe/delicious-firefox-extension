var deliciousService = {
  
  _version : null,  
  _serverName: "http://delicious.com/",  
  _secureServerName: "https://delicious.com/",
  _betaServerName: "http://stg.delicious.com/",  
  _betaSecureServerName: "https://stg.delicious.com/",
  
  initService : function() {
  
    this.cookieManager = Components.classes["@mozilla.org/cookiemanager;1"].
                         getService(Components.interfaces.nsICookieManager);
    var bundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].
      getService(Components.interfaces.nsIStringBundleService);
    var bundle = bundleService.createBundle(
      "chrome://ybookmarks/locale/ybookmarks.properties");
    this._version = bundle.GetStringFromName(
      "extensions.ybookmarks.versionNum");
  },

  getUserName: function() {
  	var del = Components.classes["@yahoo.com/socialstore/delicious;1"]
                 .getService( Components.interfaces.nsISocialStore );      
    return del.getUserName();
  },

  getServiceName: function() {
    return "Delicious";
  },
  
  getVersionNumber : function() {
    return this._version;
  },
    
  _server: function() {
//    return "http://preview.delicious.com/";
    //return "http://qa.delicious.com/";
    //return "http://staging.delicious.com/";
    //return "http://del.icio.us/";
    //return this._serverName;    
    var del = Components.classes["@yahoo.com/socialstore/delicious;1"]
                 .getService( Components.interfaces.nsISocialStore ); 
    return del.home_url;
  },
  
  _secureServer: function() {
//    return "https://secure.delicious.com/";
//    return "https://qa.delicious.com/";
    //return "https://staging.delicious.com/";
    //return "https://secure.del.icio.us/";    
    var del = Components.classes["@yahoo.com/socialstore/delicious;1"]
                 .getService( Components.interfaces.nsISocialStore ); 
    if(del.home_url == this._betaServerName) {
        return this._betaSecureServerName;
    }                     
    return this._secureServerName;
  },
  
  _src: function() {
    return "src=ffbmext" + this.getVersionNumber();
  },
  
  _partner: function() {
    return "&partner=ffbmext";
  },

  _feedServer: function () {
  	 return "http://delicious.com/";
  },
  
  getLoginUrl: function() {
    return this._secureServer() + "login?" + this._src() + this._partner();
  },

  getLoginWindowUrl: function() {
    return this._secureServer() + "login?noui=yes&v=5&" + this._src() + this._partner();
  },

  getCreateUserUrl: function() {
    return this._secureServer() + "register?" + this._src() + this._partner();
  },
  
  getBundleUrl: function () {
    return this._secureServer() + "settings/" + this.getUserName() + "/tags/bundle";
  },
  
  getEditBundleUrl: function (aBundle) {
    return this._secureServer() + "settings/" + this.getUserName() + "/tags/bundle" + "?bundle=" + encodeURIComponent(aBundle);
  },

  getMoreAboutUrl : function(comp) {
    return this._server() + "url?url=" + encodeURIComponent(comp);
  },

  getSearchUrl : function(q) {
//    return this._server() + "search?p=" + encodeURIComponent(q) + "&type=all";
  	return this._server() + "search?p=" + encodeURIComponent(q) + "&u=&chk=&context=all&fr=del_icio_us&lc=1";
  },

  /** Generate a URL for the given path aPath, using delicious server */

  getUrl : function(aPath) {
    if (aPath) {
      return this._server() + aPath;
    } else {
      return this._server();
    }
  },
 
  /** Same as getUrl but also adds "src=" field */

  getUrl2 : function(aPath) {
    return this.getUrl(aPath) + "?" + this._src();
  },

  getTourUrl : function() {
     return this.getUrl2("help/ff/success");
  },

  getQuickTourUrl : function() {
     return this.getUrl("help/quicktour?tour=firefox");
     //return this.getUrl("help/firefox/bookmarks/quicktour"); 
  },

  getPostRssUrl : function(url, title, notes, rss) {
      var result = deliciousService.getUrl("post") + "?url=" +
        encodeURIComponent(url) + "&title=" + encodeURIComponent(title);

      if (notes.length > 0) {
         result += '&extended=' + encodeURIComponent(notes);
      }

      result += "&tags=" + encodeURIComponent(rss) +
        "&v=5&noui&jump=close&" + this._src();
      return result;
  },
  getPostUrl : function(url, title, notes) {
      var result = deliciousService.getUrl("post") + "?url=" +
        encodeURIComponent(url) + "&title=" + encodeURIComponent(title);

      if (notes.length > 0) {
         result += '&notes=' + encodeURIComponent(notes);
      }

      result += "&v=5&noui&jump=close&" + this._src();
      return result;
  },
  getNetworkFeedUrl : function () {
  	var user = this.getUserName();    
    if(user) {
    	return (this._feedServer() + "v2/rss/network/" + user);
    }
    return "";    
  },
   getAlertFeedUrl : function () {
    return this._feedServer() + "v2/rss/alerts";
  },
  getNetworkUrl : function () {  	
  	var user = this.getUserName();    
    if(user) {
    	return (this._server() + "network/" + user);
    }
    return (this._server() + "network/");
  },
  getLinks4uUrl : function () {
  	//return this._server()+"inbox/";
  	var user = this.getUserName();    
    if(user) {
  		return this._server()+ "for/" + user;
    } else {
    	return this._server() + "for/";
    }
  },
  getTagometerUrl : function () {
  	return this._feedServer() + "v2/json/urlinfo/";
  },
  getAlertUrl : function () {
  	return this._server();
  },
  getRegisterSuccessUrl: function () {
  	return this._secureServer() + "register/tools";
  },
  getBrowseBarUrl: function () {
  	return this._server() + "browsebar/";
  }
};

deliciousService.initService();

