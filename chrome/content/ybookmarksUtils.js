/*
 * This file has all the utility functions required by popup, dialog and main window
*/
var YB_PLATFORM_MAC = "mac";
var YB_PLATFORM_WIN = "win";
var YB_PLATFORM_UNIX = "unix";

var YB_FIREFOX_BOOKMARK_FILE = "bookmarks.html";
var YB_FIREFOX_PLACES_BOOKMARK_FILE = "bookmarks.postplaces.html";
var YB_FIREFOX_PLACES_EXPORT_BOOKMARK_FILE = "ybookmarks.exportplaces.html";
var YB_EXTENSION_MODE_CLASSIC = "classic";
var YB_EXTENSION_MODE_STANDARD = "standard";

//Constants for Network providers, these should be ideally const.
//Including it from xbl and the parent xul causes redefinition errors.
//TODO:remove ybookmarksUtils includes from xbl and make sure that parent xul does the include.
var DEL_PROVIDER_TWITTER = "twitter";
var DEL_PROVIDER_DELICIOUS = "delicious";
var DEL_PROVIDER_EMAIL = "email";
var DEL_TAG_TWITTER = "@twitter";
var DEL_XTOAUthCookie = "XTOAuth";

var ybookmarksUtils = {
  _platform: null,
  _prefs: null,
  _DOTCOMHOST: ".delicious.com",

  openWindow: function(url, title, width, height) {
    width = (width?width:300);
    height = (height?height:300);    
    /*
    var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].
              getService(Components.interfaces.nsIWindowWatcher);
    var win = ww.openWindow( null, url, title, options, null );    
    return win;    
    var options = "centerscreen,menubar=0,toolbar=0,scrollbars=0,location=1,status=1,resizable=1,width=" + width + ",height=" + height;    
    //var options = "centerscreen,location,resizable,width=" + width + ",height=" + height;    
    var win = window.open(url, title, options);    
    win.focus();   
    */   
      var left = parseInt( ( screen.availWidth / 2 ) - ( width / 2 ) ); 
      var top  = parseInt( ( screen.availHeight / 2 ) - ( height / 2 ) );
      var props = "width=" + width + ",height=" + height + ",left=" + left + ",top=" + top +
         ",menubar=0,personalbar=0,toolbar=0,directories=0,scrollbars=0,location=1,status=1,resizable=1";
      var newWindow = window.open( url, "", props );
      newWindow.focus();   
      return newWindow;   
  },
  
  openPreferences : function(panelTabName) {

     setTimeout(function(panelTabName){ ybookmarksUtils._openPreferencesTab(panelTabName); }, 100, panelTabName);
     openPreferences("paneBookmarks");
  },
   
  _openPreferencesTab : function(panelTabName) {
    
    var wm = Components.classes[ "@mozilla.org/appshell/window-mediator;1" ]
                           .getService( Components.interfaces.nsIWindowMediator );
    var ref = wm.getMostRecentWindow("Browser:Preferences");
    if (ref) {
       var box, panel, tab;
       box = ref.window.document.getElementById( "bookmarksPrefs" );
       tab = ref.window.document.getElementById( "tab_" + panelTabName );
       panel = ref.window.document.getElementById( "tbp_" + panelTabName );
       if ( ( box != null ) && ( panel != null ) && ( tab != null ) ) {
          box.selectedTab = tab;
          box.selectedPanel = panel;
       }
    }
  },
  
  /**
   * Get the user's profile directory
   */
  getProfileDir : function() {
    var dirService = Components.classes["@mozilla.org/file/directory_service;1"].
                     getService(Components.interfaces.nsIProperties);
    var profileDir = dirService.get("ProfD", Components.interfaces.nsILocalFile);

    return profileDir;
  },
  
  /**
   * Return the string contents of a file
   * @param aFilename the name of the file
   */  
  fileContentsAsString : function(aFilename) {
    try {
        var fileString = "";        
        var file = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(aFilename);
        var fis = Components.classes["@mozilla.org/network/file-input-stream;1"]
                                           .createInstance(Components.interfaces.nsIFileInputStream);
        fis.init(file, 0x01, -1, 0);        
        var charset = "UTF-8";
        var bufSize = 4096;
        const replacementChar = Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
        var is = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                   .createInstance(Components.interfaces.nsIConverterInputStream);
        is.init(fis, charset, bufSize, replacementChar);
        var str = {};
        while (is.readString(bufSize, str) != 0) {
          fileString += str.value;          
        }
    } catch(e) {
        yDebug.print("fileContentsAsStringNew()::=>  Error reading file: " + aFilename + " Exception:" + e, YB_LOG_MESSAGE);        
        fileString = null;        
    } finally {
        if (is) { is.close(); }
        if (fis) { fis.close(); }
    }
    return fileString;
  
  },
  
  getUnicodePref: function(prefName, prefBranch) {
      return prefBranch.getComplexValue(prefName, Components.interfaces.nsISupportsString).data;
  },

  setUnicodePref: function (prefName, prefValue, prefBranch) {
      var sString = Components.classes["@mozilla.org/supports-string;1"].
                      createInstance(Components.interfaces.nsISupportsString);
      sString.data = prefValue;

      prefBranch.setComplexValue(prefName,  Components.interfaces.nsISupportsString, sString);
  },
  
  getPlatform : function(){
    if (this._platform == null) {
      var platform = new String(navigator.platform);
      if(!platform.search(/^Mac/)) 
         this._platform = YB_PLATFORM_MAC;
      else if(!platform.search(/^Win/))
         this._platform = YB_PLATFORM_WIN;
      else 
         this._platform = YB_PLATFORM_UNIX;
    }
    
    return this._platform; 
  },
   
   
  importStatusCallback: {
       _notify: function(subject, topic, data) {
             var os = Components.classes["@mozilla.org/observer-service;1"]
                         .getService(Components.interfaces.nsIObserverService);
             var xpcData = Components.classes["@mozilla.org/supports-string;1"].
                                        createInstance(Components.interfaces.nsISupportsString);
              var xpcSubject = Components.classes["@mozilla.org/supports-string;1"].
                                        createInstance(Components.interfaces.nsISupportsString);
              xpcSubject.data = subject;
              xpcData.data = data;
              os.notifyObservers(xpcSubject, "ybookmark.importBookmarks", xpcData);
        },
        
        onload: function(result) {
          var propertyBag = result.queryElementAt(0, Components.interfaces.nsIPropertyBag);
          var status = propertyBag.getProperty("status");  
          yDebug.print("getImportstatus callback: onload: " + status);
          //complete", "importing" or "failed
          this._notify("importProgress", "ybookmark.importBookmarks", status); 
            
        },
      
        onerror: function(event) {
          yDebug.print("getImportStatus callback: onerror ");
          this._notify("importError", "ybookmark.importBookmarks", null);
          //yDebug.print("importBookmark callback: notified observers");
          
        }      
  },
  
  exportPlacesToHtml : function() {
    
    try {
        var file = Components.classes["@mozilla.org/file/directory_service;1"]
                         .getService(Components.interfaces.nsIProperties)
                         .get("ProfD", Components.interfaces.nsIFile);
        file.append(YB_FIREFOX_PLACES_EXPORT_BOOKMARK_FILE);
        if( !file.exists() || !file.isFile() ) {   // if it doesn't exist, create
           file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0777);
        }            
        var localFile = Components.classes["@mozilla.org/file/local;1"].
                createInstance(Components.interfaces.nsILocalFile);
        localFile.initWithPath(file.path);        
        var exporter = Components.classes["@mozilla.org/browser/places/import-export-service;1"].
                         getService(Components.interfaces.nsIPlacesImportExportService);
        exporter.exportHTMLToFile(localFile);           
    } catch(e) {
      yDebug.print("Exception in exportPlacesToHtml(): "  + e, YB_LOG_MESSAGE);
    }
    
  },
  
  startImport : function(userTags, addPopularTags, overwrite, filePath, email, priv) {
    
    try {   
        var bookmarksString;
        var xpcUserTags;
        if (!filePath || filePath.length == 0) {
	          var profileDir = this.getProfileDir();		
		      //If FF3 or more use different filename		
	          if(ybookmarksUtils.getFFMajorVersion() > 2) {	          	      	  
                  this.exportPlacesToHtml(); 
                  profileDir.append(YB_FIREFOX_PLACES_EXPORT_BOOKMARK_FILE);	      	  
	          } else {	          
		          profileDir.append(YB_FIREFOX_BOOKMARK_FILE);
	          }      
	          if (profileDir.isFile()) {
	            profileDir.QueryInterface(Components.interfaces.nsIFile);
	            filePath = profileDir.path;
	            bookmarksString = ybookmarksUtils.fileContentsAsString(filePath);	            
	            //Delete the temporary file
	            if(ybookmarksUtils.getFFMajorVersion() > 2) {	             
	                 profileDir.remove(false);
	            }
	          }
        }
        else {      
            var file = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(filePath);
            if (file.isFile()) {
              bookmarksString = ybookmarksUtils.fileContentsAsString(filePath);
            }  
        }    
    } catch(e) {
        yDebug.print("Exception in ybookmarksutils::startImport(): "  + e, YB_LOG_MESSAGE);
    }
    this.startImportWithBookmarksString(userTags, addPopularTags, overwrite, encodeURIComponent(bookmarksString),email, priv);
    
  },
  
  //Note that bookmarksString is URIencoded.  
  startImportWithBookmarksString : function(userTags, addPopularTags, overwrite, bookmarksString, email, priv)  {

      var xpcUserTags = Components.classes["@mozilla.org/array;1"]
                           .createInstance(Components.interfaces.nsIMutableArray);

      for (var i = 0; i < userTags.length; i++) {
        var tag = Components.classes["@mozilla.org/supports-string;1"].
                    createInstance(Components.interfaces.nsISupportsString);
        tag.data = userTags[i];
        xpcUserTags.appendElement(tag, false);
      }
       
      var ssr = Components.classes["@yahoo.com/socialstore/delicious;1"].
         getService(Components.interfaces.nsISocialStore);           
        
      var cb = {
        
         _getStatus: function () {
            var ssr = Components.classes["@yahoo.com/socialstore/delicious;1"].
                  getService(Components.interfaces.nsISocialStore);          

           //complete", "importing" or "failed
           ssr.getImportStatus(ybookmarksUtils.importStatusCallback);
         },
         
         onload: function(result) {
           var propertyBag = result.queryElementAt(0, Components.interfaces.nsIPropertyBag);
           var status = propertyBag.getProperty("status");  
           yDebug.print("cb.onload: " + status);
           this._getStatus(); 
         },
         
         onerror: function(event) {
            yDebug.print("cb.error", YB_LOG_MESSAGE);
            this._getStatus();
         }
      };
    
      //"accepted" or "busy"
      ssr.importBookmarks(bookmarksString, xpcUserTags, addPopularTags, overwrite, parseInt(email), parseInt(priv), cb);
  },

  openTag: function(tag, aEvent) {
      var where = whereToOpenLink(aEvent);      
      openUILinkIn(deliciousService.getUrl("popular/" + tag), where);
  },

  openBookmark: function(aEvent, where) {
    var type = aEvent.target.getAttribute( "type" );
    if (type == "Bookmark") {  
      var url = aEvent.target.getAttribute( "url" );
      //need to manually close the menupopup
      if(aEvent.button == 1)
      
        ybBookmarksMenu.closeMenuPopup(aEvent.target);

      if (!where) {
        // hack for tabs mix plus
        if (!ybookmarksUtils._prefs) {
          ybookmarksUtils._prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefBranch);
        }
        var tabMixPlusOpenInTab = false;
        try {
          // tabsmixplus open all bookmarks in new tab
          tabMixPlusOpenInTab = ybookmarksUtils._prefs.getBoolPref("extensions.tabmix.opentabfor.bookmarks");
        } catch (e) {}
        
        if (tabMixPlusOpenInTab) {
          where = "tab";
        } else {
          where = whereToOpenLink(aEvent);
        }
      }
      openUILinkIn ( url, where );
    }
  },
  
  
  getTopWindow : function() {
      
      var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
      var windowManagerInterface = windowManager.QueryInterface(Components.interfaces.nsIWindowMediator);
      var topWindow = windowManagerInterface.getMostRecentWindow( "navigator:browser" );
    
      return topWindow;
  },

  /**
   * returns character index of tag if found, -1 otherwise
   */
  containsTag: function( str, tag ) {
    var retval = -1;
    var startIndex = 0;
    var idx;
    do {
      idx = str.indexOf( tag, startIndex );
      if( idx != -1 ) {
        if( ( ( idx == 0 ) || ( str[ idx - 1 ] == ' ' ) ) && 
          ( ( idx + tag.length == str.length ) || ( str[ idx + tag.length ] == ' ' ) ) ) {
            retval = idx;
          }
        startIndex += tag.length;
      }
    } while( ( idx != -1 ) && ( startIndex < str.length ) && ( retval == -1 ) );
    return retval;
  },
  
  /**
    * Convert the timestamp from del API to a UI friendly string.  Use this to
    * keep the Date strings in the UI maintainably consistent.
    */
  usecToUIString: function(usec) {
    var date = new Date (usec / 1000);
    var str = date.toLocaleDateString() + " " + date.toLocaleTimeString();
    return str;
  },
  
  jsStringToNs: function(jsString) {
    var nsString = Components.classes["@mozilla.org/supports-string;1"]
                    .createInstance(Components.interfaces.nsISupportsString);
    nsString.data = jsString;
    
    return nsString;
  },
  
  jsArrayToNs: function(jsArray) {
    var nsArray = Components.classes["@mozilla.org/array;1"]
                    .createInstance(Components.interfaces.nsIMutableArray);

    for ( var counter = 0; counter < jsArray.length; ++counter ) {
      var str = ybookmarksUtils.jsStringToNs(jsArray[counter]);
      nsArray.appendElement ( str, false );
    }

    return nsArray;
  },
  
  nsArrayToJs: function(nsArray) {
    var result = [];
    nsArray.QueryInterface(Components.interfaces.nsIArray);
    var nsEnum = nsArray.enumerate();
    while (nsEnum.hasMoreElements()) {
      var e = nsEnum.getNext();
      e.QueryInterface(Components.interfaces.nsISupportsString);
      result.push(e.data);
    }
    return result;
  },
  
  nsBundleToJs: function(nsBundle) {
    var result = { name:  nsBundle.name,
                   tags:  ybookmarksUtils.nsArrayToJs(nsBundle.tags),
                   order: nsBundle.order };
    return result;
  },
  
  uniqueBookmarkArray: function(aArray) {
    var table = {};
    var result = [];
    for (var i=0; i < aArray.length; i++ ) {
      var bm = aArray[i];
      if (!table[bm.url]) {
        table[bm.url] = bm;
      }
    }
    for (url in table) {
      result.push(table[url]);
    } 
     return result;
    },
  
  CC                        : Components.classes,
  CI                        : Components.interfaces,
  gNC_NS                    : "http://home.netscape.com/NC-rdf#",
  gRDF_NS                   : "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  gWEB_NS                   : "http://home.netscape.com/WEB-rdf#",
  NS_BOOKMARK_BASE          : "http://www.mozilla.org/bookmark#",
  nsIRDFLiteral             : Components.interfaces.nsIRDFLiteral,

  bindMethod                : function(obj, fn) { return function() { fn.apply(obj, arguments); } },
  getService                : function(classx, interfacex) { return ybookmarksUtils.CC[classx].getService(ybookmarksUtils.CI[interfacex]); },
  addObserver               : function(subject) { ybookmarksUtils.observerService.addObserver(this, subject, false); },
  removeObserver            : function(subject) { ybookmarksUtils.observerService.removeObserver(this, subject); },

  importSymbols             : function(scope) {
      for (var i = 1; i < arguments.length; i++) {
          var value = ybookmarksUtils[arguments[i]];
          //yDebug.print("Importing \"" + arguments[i] + "\" = \"" + value + "\" from ybookmarksUtils");
          if (!value) {
              yDebug.print("WARNING: \"" + arguments[i] + "\" is not defined in ybookmarksUtils");
          }
          scope[arguments[i]] = value;
      }
  },

  /**
   **  Searches given string for keywords. By default, it does a
   **  disjunction search (returns true if str contains _ANY_ of the
   **  keywords). Conjunction search can be specified using the last
   **  arg
   **/
  searchStringForKeywords : function(str, keywords, conjunction) {
      if (keywords.length == 0) return false;
      if (conjunction == null) conjunction = false;

      str = str.toLowerCase();
      var nValidKeywords = 0, nMatches = 0;
      for (var i = 0; i < keywords.length; ++i) {
          if (keywords[i].length > 0) {
              ++nValidKeywords;
              if (str.indexOf(keywords[i]) != -1) {
                  if (!conjunction) return true; else ++nMatches;
              }
          }
      }
      if (nMatches == nValidKeywords) return true; // can only be conjunction
      else return false;
  },

  /**
   **  Takes a string of text and wraps it to maxLength characters per
   **  line.  The return value is an array of lines, where each line
   **  is a string and line.length <= maxLength
   **/
  lineWrap                  : function(content, maxLength) {
      var arrLines = [];
      var words = content.split(' ');
      var currLineWords = [];
      var currLineLength = 0;
      for (var i = 0; i < words.length; i++) {
          var word = words[i];
          if (word.length > maxLength) {
              ybookmarksUtils.arrayInsertAt(words, i + 1, word.slice(maxLength));
              word = word.slice(0, maxLength);
          }
          if (currLineLength + word.length > maxLength) {
              arrLines.push(currLineWords.join(' '));
              currLineWords = [word];
              currLineLength = word.length;
          } else {
              currLineWords.push(word);
              currLineLength += word.length;
          }
      }
      if (currLineLength > 0) {
          arrLines.push(currLineWords.join(' '));
      }
      return arrLines;
  },

  removeAllChildren         : function(node) {
      while (node.firstChild) {
          node.removeChild(node.firstChild);
      }
  },

  /**
   **  The JavaScript Array.splice method can only splice single
   **  elements into an array. If you needed to splice an array into
   **  an array, you could call Array.splice repeatedly, but this is
   **  very inefficient because it has to repeatedly shift the
   **  contents of the array. This function is more efficient; it
   **  simply returns a new array with childrenToInsert spliced into
   **  arr.
   **/
  arraySplice               : function(arr, row, childrenToInsert) {
      return arr.slice(0, row).concat(childrenToInsert, arr.slice(row));
  },

  /**
   **  This function simply inserts an element at a given position in
   **  an array.  It knows to append the new element if it's going at
   **  the end of the array; otherwise it does an Array.splice
   **/
  arrayInsertAt             : function(arr, pos, elem) {
      var length = arr.length;
      if (pos == length) {
          arr[pos] = elem;           // Append
      } else if (pos < length) {
          arr.splice(pos, 0, elem);  // Insert into using splice
      } else {
          
      }
  },

  /**
   **  Return the index of the first element in the array arr for
   **  which the function fn evaluates to true.
   **/
  linearSearch              : function (arr, fn) {
      var length = arr.length;
      for (var i = 0; i < length; i++) {
          if (fn(arr[i])) return i;
      }
      return -1;
  },

  /**
   **  This function defines a getter function for an object property.
   **  Furthermore, the output of the function is memoized (i.e.: cached)
   **  so that further reads of this property come out of the cache instead
   **  of calling the function again. For expensive functions, memoizing
   **  can result in great gains in efficiency.
   **
   **  Sample usage:
   **
   **  Tag.prototype.memoizeGetter = memoizeGetter;
   **  Tag.prototype.memoizeGetter("NumBookmarks", function() { 
   **      return bookmarksStore.getTotalBookmarksForTag(this.Name);
   **  });
   **/
  memoizeGetter             : function(name, func) {
      this.__defineGetter__(name, function() {
          if (!this.cache) this.cache = {};
          var fromCache = this.cache[name];
          if (typeof fromCache != "undefined") {
              return fromCache;
          } else {
              return this.cache[name] = func.apply(this, arguments);
          }
      });
  },

  get socialStore()         { return this.getService("@yahoo.com/socialstore/delicious;1", "nsISocialStore"); },
  get prefs()               { return this.getService("@mozilla.org/preferences-service;1", "nsIPrefBranch"); },
  get observerService()     { return this.getService("@mozilla.org/observer-service;1", "nsIObserverService"); },
  get atomService()         { return this.getService("@mozilla.org/atom-service;1", "nsIAtomService"); },

  setCookie : function(cookieName, uri, cookieDomain, value, expireAfterDays){
  	yDebug.print("ybookmarkUtils.js::ybookmarkUtils::setCookie()=>Invoked",YB_LOG_MESSAGE);
  	try {
 	var ios = Components.classes["@mozilla.org/network/io-service;1"]
 			.getService(Components.interfaces.nsIIOService);
	var uri = ios.newURI(uri, null, null);
	var obj = Components.classes["@mozilla.org/cookieService;1"].getService(Components.interfaces.nsICookieService);

	var cookieValue = cookieName + "=" + value+ ";domain=" + cookieDomain;

	if (expireAfterDays > 0){
		var expiryDate=new Date(); // today's date
		expiryDate.setDate(expiryDate.getDate()+expireAfterDays);
		cookieValue+= ";expires=" + expiryDate.toGMTString();
	}
	
	yDebug.print("Creating Cookie => "+cookieValue, YB_LOG_MESSAGE);
	obj.setCookieString(uri,null,cookieValue,null);
  	}catch (e){
  		yDebug.print("ybookmarkUtils.js::ybookmarkUtils::setCookie()=>Exception: "+e,YB_LOG_MESSAGE);
  	}
  },
  cookieExists : function(cookieName, cookieDomain){
  	yDebug.print("ybookmarkUtils.js::ybookmarkUtils::cookieExists()=>Invoked",YB_LOG_MESSAGE);
  	try {
		var cookieManager = ( Components.classes[ "@mozilla.org/cookiemanager;1" ]
	    		.getService( Components.interfaces.nsICookieManager ) );
	    var iter = cookieManager.enumerator; 
	    while( iter.hasMoreElements() ) { 
	    	var cookie = iter.getNext(); 
	        if( cookie instanceof Components.interfaces.nsICookie ) { 
	        	if( cookie.host == cookieDomain && cookie.name == cookieName ) {
	            	return true;
	            }
	        }
	    }
  	}catch (e){
  		yDebug.print("ybookmarkUtils.js::ybookmarkUtils::cookieExists()=>Exception: "+e,YB_LOG_MESSAGE);
  	}
    return false;
  },
  
  	openLinkToNewTab: function(url) {
  		try {
		 	var windowManager = ( Components.classes[ "@mozilla.org/appshell/window-mediator;1" ] ).getService();
			var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator );
			var browser = ( windowManagerInterface.getMostRecentWindow( "navigator:browser" ) ).getBrowser();
		    
		    var newTab = browser.addTab( url );
		    browser.selectedTab = newTab;
  		} catch (e) {
  			yDebug.print("ybookmarksUtils.js::ybookmarksUtils::openLinkToNewTab()=>Exception: "+e,YB_LOG_MESSAGE);
  		}
	 },
	 evaluateXPath: function(aNode, aExpr) {
		 try {
			  var xpe = new XPathEvaluator();
			  var nsResolver = xpe.createNSResolver(aNode.ownerDocument == null ?
			    aNode.documentElement : aNode.ownerDocument.documentElement);
			  var result = xpe.evaluate(aExpr, aNode, nsResolver, 0, null);
			  var found = [];
			  var res;
			  while (res = result.iterateNext()) {
			    found.push(res);
			  }
			  return found;
		 }catch(e){
		 	yDebug.print("Exception in ybookmarksUtil.js::evaluateXPath() =>" + e,YB_LOG_MESSAGE);
		 }
},
	
	getExtensionMode:  function() {
		ybookmarksUtils._prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefBranch);
		var mode = "" ;
		try {
			mode = ybookmarksUtils._prefs.getCharPref( "extensions.ybookmarks@yahoo.engine.current.mode");
		} catch(e){}
		if(mode == YB_EXTENSION_MODE_CLASSIC || mode == YB_EXTENSION_MODE_STANDARD) {
			return mode;
		} else {
			return YB_EXTENSION_MODE_STANDARD;                        
		}
	},
	 
	getFFMajorVersion: function () {
	    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo);

		return parseInt(appInfo.version);                     
	},
	        
   /**
    * Function to check if the window is the recent window, can be used to make sure that the js function gets called only once 
    *  even if there are mutiple windows.
    *  Example if(isRecentWindow()) { import_bookmarks();}  //makes sure that function gets called only once 
    */	
	isRecentWindow: function () {
		var wm =
            Components.classes["@mozilla.org/appshell/window-mediator;1"].
               getService(Components.interfaces.nsIWindowMediator);
        if(wm.getMostRecentWindow("navigator:browser") == window) {
        	return true;
        } else {
        	return false
        }      
	},	
	   
	
	/**
	 * Copied from FF2 source to make things work in FF2 and FF3
	 */
	getDescriptionFromDocument: function (aDocument) {
	    var metaElements = aDocument.getElementsByTagName('META');
	    for (var m = 0; m < metaElements.length; m++) {
	      if (metaElements[m].name.toLowerCase() == 'description' || metaElements[m].httpEquiv.toLowerCase() == 'description')
	        return metaElements[m].content;
	    }
	    return '';
  },
  
  isOSXLeopard: function()
  {
    var osDesc = window.navigator.oscpu;
    //Mac OS X 10.5 - leopard
    if(osDesc.indexOf("Mac OS X") == -1) {
        return false; 
    }    
    return true;
  },
    
  /**
    * Closes all windows and restarts the browser.
    */
  restartBrowser: function() {
     this._quit(true);
  },
   
   /**
    * Closes all windows
    */
  quitBrowser: function() {
     this._quit(false);
  },
   
   /**
    * Closes all windows and restarts the browser.
    * Based on http://lxr.mozilla.org/mozilla1.8/source/toolkit/mozapps/update/content/updates.js#1609
    */
  _quit: function(aRestart) {
         // This process is *extremely* retarded. There should be some nice 
         // integrated system for determining whether or not windows are allowed
         // to close or not, and what happens when that happens. We need to 
         // jump through all these hoops (duplicated from globalOverlay.js) to
         // ensure that various window types (browser, downloads, etc) all 
         // allow the app to shut down. 
         // bsmedberg?     
    
         // Notify all windows that an application quit has been requested.
         var appStartup = 
             Components.classes["@mozilla.org/toolkit/app-startup;1"].
             getService(Components.interfaces.nsIAppStartup);

         var os = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
         var cancelQuit = 
             Components.classes["@mozilla.org/supports-PRBool;1"].
             createInstance(Components.interfaces.nsISupportsPRBool);
         os.notifyObservers(cancelQuit, "quit-application-requested", null);
    
         // Something aborted the quit process. 
         if (cancelQuit.data) {
           return;
         }
         // Notify all windows that an application quit has been granted.
         os.notifyObservers(null, "quit-application-granted", null);
    
         // Enumerate all windows and call shutdown handlers
         var wm =
             Components.classes["@mozilla.org/appshell/window-mediator;1"].
             getService(Components.interfaces.nsIWindowMediator);
         var windows = wm.getEnumerator(null);
         while (windows.hasMoreElements()) {
           var win = windows.getNext();
           if (("tryToClose" in win) && !win.tryToClose())
             return;
           }
        
         if (aRestart) {
           appStartup.quit(appStartup.eForceQuit | appStartup.eRestart);
         }
         else {
           appStartup.quit(appStartup.eAttemptQuit);
         }
  },
  
  setExtensionCookie : function() {
        try {
            var DEL_COOKIE_DOMAIN = '.delicious.com';
            var DEL_COOKIE_NAME = 'FFDeliciousXT';
            var DEL_COOKIE_DATA = 'version=2.0';
            var DEL_COOKIE_URL = 'http://delicious.com/';
            var DEL_COOKIE_EXPIRE_AFTER_DAYS = 0; // create session cookie
            
       		var expiryDate = new Date(); // today's date
    		expiryDate.setDate( expiryDate.getDate() + DEL_COOKIE_EXPIRE_AFTER_DAYS );
    		if(ybookmarksUtils.getFFMajorVersion() > 2) {
                 // Create delicious XT session cookie which is required to complete server registration flow
                 var cm2 = ( Components.classes[ "@mozilla.org/cookiemanager;1" ]
                                               .getService( Components.interfaces.nsICookieManager2 ) );
    		    //set session expiry
                cm2.add(DEL_COOKIE_DOMAIN, "/", DEL_COOKIE_NAME, DEL_COOKIE_DATA, false, false, true, expiryDate.getTime());
            } else {
                ybookmarksUtils.setCookie(DEL_COOKIE_NAME, DEL_COOKIE_URL, DEL_COOKIE_DOMAIN, DEL_COOKIE_DATA, expiryDate.toGMTString());
            }
            
		 } catch(e) { yDebug.print("Force set cookie "+e, YB_LOG_MESSAGE); }
  },
  
  //replace + with space
  sanitizeFavtag : function(favTag) {
    if(favTag) {
        return favTag.replace(/\+/g," ");
    }
  },
  
  isAwesomebarIntegrationEnabled: function() {
    try {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefBranch);
        if( (prefs.getBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousSearch") == true) || 
            (prefs.getBoolPref("extensions.ybookmarks@yahoo.awesomebar.showOnlyDeliciousSearch") == true) || 
            (prefs.getBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousTags") == true) 
             ) {
            return true;
        }
    } catch(e) {
        yDebug.print("ybookmarksUtils::isAwesomebarIntegrationEnabled()=> Error:" + e,YB_LOG_MESSAGE);
    }
    return false;
  },
  
  disableAwesomeBarIntegration: function() {
    try {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefBranch);
        prefs.setBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousSearch", false);        
        prefs.setBoolPref("extensions.ybookmarks@yahoo.awesomebar.showOnlyDeliciousSearch", false);        
        prefs.setBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousTags", false);
        yDebug.print("Disabled all awesomebar features.");
    } catch(e) {
        yDebug.print("Exception in ybookmarksUtils::disableAwesomeBarIntegration()=>" + e, YB_LOG_MESSAGE);
    }
  },
  
  //Function trims whitespaces from the left and right of a string
  trimStr: function(str) {
    return str.replace(/^\s+/, "").replace(/\s+$/, "")
  },
  
  base64Encode: function (aBytes) {
  	try {
	  const B64_CHARS =
	  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	  var out = "", bits, i, j;
	
	  var k = 0;
	  while ((aBytes.length - k) >= 3) {
	    bits = 0;
	    for (i = 0; i < 3; i++) {
	      bits <<= 8;
	      bits |= aBytes[k];
	      k++;
	    }
	    for (j = 18; j >= 0; j -= 6)
	      out += B64_CHARS[(bits>>j) & 0x3F];
	  }
	
	  switch (aBytes.length - k) {
	    case 2:
	      out += B64_CHARS[(aBytes[k]>>2) & 0x3F];
	      out += B64_CHARS[((aBytes[k] & 0x03) << 4) | ((aBytes[k+1] >> 4) & 0x0F)];
	      out += B64_CHARS[((aBytes[k + 1] & 0x0F) << 2)];
	      out += "=";
	      break;
	    case 1:
	      out += B64_CHARS[(aBytes[k]>>2) & 0x3F];
	      out += B64_CHARS[(aBytes[k] & 0x03) << 4];
	      out += "==";
	      break;
	  }
	  return  out;
    } catch(e) {
  	  yDebug.print("ybookmarksUtils::base64Encode::Error-"+e, YB_LOG_MESSAGE);
    }
  },
  
  isTwitterOAuthEnabled: function() {
    var oAuthEnabled = false;
    try {
    oAuthEnabled = Components.classes["@mozilla.org/preferences-service;1"].
	       getService(Components.interfaces.nsIPrefBranch).
               getBoolPref("extensions.ybookmarks@yahoo.extension.twitter.OAuth.enabled");
    } catch(e){}
    return oAuthEnabled;
  },
  
  processDBException: function(e) {
    if(e && e.result) {
      switch(e.result) {
	case Components.results.NS_ERROR_FILE_CORRUPTED:
	  yDebug.print("ybookmarksUtils::processException()::Store Corrupted", YB_LOG_MESSAGE);
	  try {
	  Components.classes["@mozilla.org/preferences-service;1"].
	      getService(Components.interfaces.nsIPrefBranch).
	      setBoolPref("extensions.ybookmarks@yahoo.extension.localstore.corrupt", true);
	  } catch(e) {
	    yDebug.print("ybookmarksUtils::processException()::Store Corrupted->Setting pref failed:" + e, YB_LOG_MESSAGE);
	  }
	    /*
	    var os = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService);
	    os.notifyObservers(null, "ybookmark.localStoreError", "Components.results.NS_ERROR_FILE_CORRUPTED");
	    */
	  break;
	case Components.results.NS_ERROR_FILE_IS_LOCKED:
	  yDebug.print("ybookmarksUtils::processException()::Store locked", YB_LOG_MESSAGE);
	  break;
	case Components.results.NS_ERROR_FILE_ACCESS_DENIED:
	  yDebug.print("ybookmarksUtils::processException()::Store access denied", YB_LOG_MESSAGE);
	  break;
    default:
        yDebug.print("ybookmarksUtils::processException()::Store Error: "+e, YB_LOG_MESSAGE);
      }
    }
  },
  
  /**
   * returns default favicon based on FF version
   */
  getDefaultFavicon: function () {
    if(this.getFFMajorVersion() > 2) {
      return "chrome://mozapps/skin/places/defaultFavicon.png";
    } else {
      return "chrome://browser/skin/bookmarks/bookmark-item.png";
    }
  }
};
