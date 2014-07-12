var ybookmark_Utils = {

  getAllTags: function() {
    return ybookmarksMain.gBookmarks.getAllTags(null, "alpha");
  },

  getPopularTags: function(aCount) {

    if ( !aCount ) {
      aCount = 20;
    }
    var result = new Array();
    var topWindow = this._getTopWindow();
    var order = "descending";
    var column = topWindow.document.getElementById( "bookmark-tags-tree-count-col" );
    var sortResource = column.getAttribute( "sort" );
    var tree = topWindow.document.getElementById( "bookmark-tags-tree" );
    tree.hidden = false;

    this._sortBookmarks( tree, column, sortResource, order );
    var totalRows = tree.view.rowCount;
    var tagColumn = tree.columns.getNamedColumn( "bookmark-tags-tree-tag-col" );
     
    for ( var counter = 0; counter < totalRows && counter < aCount; ++counter ) {
      var tag = tree.view.getCellText ( counter, tagColumn );
      result.push ( tag );
    }

    return result;
  },

  getBookmarksForTag: function(aTag, aOrder) {
    return ybookmarksMain.gBookmarks.getBookmarks(aTag, null, aOrder, null, {});
  },

  /* note that this function sorts the array in place */
  sortBookmarks: function (bookmarks, aOrder) {
    var func = null;

    if (aOrder == "chrono") {
      func = function(a, b) { return a.added_date - b.added_date; };
    } else if (aOrder == "chrono_reverse") {
      func = function(a, b) { return b.added_date - a.added_date; };      
    }

    if (func != null) {
      bookmarks.sort(func);
    }   
  },
  
  _getIntersectingBookmarks: function(aArrays) {
    var bookmarks = {};
    var result = [];
    
    for (var i=0; i < aArrays.length; i ++) {
      var array = aArrays[i];
      for (var j=0; j < array.length; j++) {
        var key = array[j].id;
        if (bookmarks[key] == undefined) {
          bookmarks[key] = { count: 1, 
                             bm: array[j]};
        } else {
          bookmarks[key].count++;
        }
      }
    }
    
    for each (var bm in bookmarks) {
      if (bm.count == aArrays.length) {
        result.push(bm.bm);
      }
    }
    return result;
  },
  
  /* returns a conjunction of the tags in the sorted order */
  getBookmarksForTagOrdered: function(aTags, aOrder) {
    try {
      var tags = aTags.split(/\++/);
      var args = [];
    
      for (var i=0; i < tags.length; i++) {
        var t = tags[i];
        if (t != "") {
          args.push(this.getBookmarksForTag(t));
        }
      }
    
      var bm = this._getIntersectingBookmarks(args);
      this.sortBookmarks(bm, aOrder);
      return bm;
    } catch (e) { 
      yDebug.print("getBookmarksForTagOrdered(" + aTags + "): " + e);
      return [];
    }
  },
  
  getSortedBookmarks: function(aSortColumn, aCount) {

    var result = new Array();
    if ( !aCount ) {
      // set it to max elements
      aCount = 99999999999;
    }

    var topWindow = this._getTopWindow();
    var order = "descending";
    var column = topWindow.document.getElementById( aSortColumn );
    var sortResource = column.getAttribute( "sort" );
    var tree = topWindow.document.getElementById( "bookmark-sort-tree" );
    tree.hidden = false;

    this._sortBookmarks( tree, column, sortResource, order );
    var totalRows = tree.view.rowCount;
    var urlColumn = tree.columns.getNamedColumn( "bookmark-sort-tree-url-col" );
     
    var index = 0;
    for ( var rowCounter = 0; rowCounter < totalRows && index < aCount; ++rowCounter ) {
      var url = tree.view.getCellText ( rowCounter, urlColumn );

      var bookmark = ybookmarksMain.gBookmarks.getBookmark( url );
      if (!bookmark || 
          ybookmarksMain.gBookmarks.resolveBookmarkResourceType(ybookmarksMain.gBookmarks.isBookmarked(url)) == "LiveBookmark" ) {
        continue;
      }

      ++index;
      result.push ( bookmark );
    }

    return result;
  },

  getFrequentBookmarks: function(aCount) {
    return this.getSortedBookmarks ( "bookmark-sort-tree-visitcount-col", aCount );
  },

  getRecentBookmarks: function(aCount) {
    return this.getSortedBookmarks ( "bookmark-sort-tree-visitdate-col", aCount );
  },

  getRecentlySavedBookmarks: function(aCount) {
    return this.getSortedBookmarks ( "bookmark-sort-tree-adddate-col", aCount );
  },

  addEmptyMenuItem: function(parent) {
    var menuItem = this.createMenuItem("(Empty)", "", "", "" );
    menuItem.setAttribute( "disabled", "true" );
    parent.appendChild ( menuItem );
  },

  removeAllMenuItems: function(menuPopup) {
    while (menuPopup.firstChild) {
      menuPopup.removeChild ( menuPopup.firstChild );
    }
  },

  getLinksForTag: function (tag) {
    var linksForTags = {
          "digital art": [
                            { "link": "http://www.adobe.com",
                              "title": "Adobe Tools"
                            },
                            { "link": "http://www.macromedia.com",
                              "title": "Macromedia vector art tools"
                            },
                         ],
          "photoshop": [
                          { "link": "http://www.adobe.com",
                            "title": "Adobe tools"
                          },
                          { "link": "http://store.adobe.com/type/index.html",
                            "title": "Adobe type library"
                          }
                       ],
          "illustration": [
                          { "link": "http://www.adobe.com",
                            "title": "Adobe tools"
                          },
                          { "link": "http://www.macromedia.com",
                            "title": "macromedia vector art tools"
                          }
                       ]
      };
    if ( linksForTags[ tag ] )
      return linksForTags[ tag ];

    return null;
  },

  createMenuItem: function(aDisplayName, aAccessKey, aCommandName, aImage) {
    var xulElement = document.createElementNS(gYBXUL_NS, "menuitem");
    xulElement.setAttribute("label", aDisplayName);
    xulElement.setAttribute("accesskey", aAccessKey);
    xulElement.setAttribute("command", aCommandName);
    xulElement.setAttribute("class", "menuitem-iconic bookmark-item");
    xulElement.setAttribute("image", aImage);
    return xulElement;
  },
  
  _sortBookmarks: function(tree, column, sortResource, order ) {    
    //To address changes in FF3
    if(ybookmarksUtils.getFFMajorVersion() > 2) {
        if(order == "descending") {
        	order = "ascending";
        }
        column.setAttribute( "sortDirection", order );           
        tree.view.sort(column);     
    } else {   	    	
        const nsIXULSortService = Components.interfaces.nsIXULSortService;
        const isupports_uri = "@mozilla.org/xul/xul-sort-service;1";    
        var xulSortService =
                Components.classes[isupports_uri].getService(nsIXULSortService);    
        xulSortService.sort(tree, sortResource, order );
        tree.builder.QueryInterface( Components.interfaces.nsIXULTreeBuilder ).sort( column );
        column.setAttribute( "sortDirection", order );
        column.setAttribute( "sortActive", "true" );
        tree.builder.rebuild();
    }
    // tree.builder.refresh();
  },

  _getTopWindow : function() {
    var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
    var windowManagerInterface = windowManager.QueryInterface(Components.interfaces.nsIWindowMediator);
    var topWindow = windowManagerInterface.getMostRecentWindow( "navigator:browser" );
  
    return topWindow;
  }
};

const gYB_sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
  getService(Components.interfaces.nsIYDelLocalStore);

function gYB_b64(aBytes) {
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
}

function gYB_getMimeType(data, length) {
  const catMgr = Components.classes["@mozilla.org/categorymanager;1"]
    .getService(Components.interfaces.nsICategoryManager);
  var sniffers = catMgr.enumerateCategory("content-sniffing-services");
  var mimeType = null;
  while (mimeType == null && sniffers.hasMoreElements()) {
    var snifferCID = sniffers.getNext().QueryInterface(Components.interfaces.nsISupportsCString)
      .toString();
    var sniffer = Components.classes[snifferCID].getService(Components.interfaces.nsIContentSniffer);
    try {
      mimeType = sniffer.getMIMETypeFromContent(data, length);
    } catch (e) {
      mimeType = null;
    }
  }
  return mimeType;
}

function gYB_saveIcon(url, data, length) {
  if (length > 0) {
  
      var mimeType = gYB_getMimeType(data, length);
      if (mimeType) {
      
          var text = "data:" + mimeType + ";base64," + gYB_b64(data);
          gYB_sqliteStore.setStringPropertyForBookmark(url, "icon", text);
         
          var os = Components.classes["@mozilla.org/observer-service;1"].
                  getService(Components.interfaces.nsIObserverService);
          var notifyData = url + " " + text;
          os.notifyObservers(null, "ybookmark.faviconLoaded", notifyData);
          
      }
   }
}

function gYB_loadFavIconNew(url, favIconUrl) {
  try {
    if (gYB_sqliteStore.isBookmarked(url)) {
      //Send notifications to refresh UI.
      var os = Components.classes["@mozilla.org/observer-service;1"].
                      getService(Components.interfaces.nsIObserverService);      
      os.notifyObservers(null, "ybookmark.updateBookmarksView", "");
              
      var bookmark = gYB_sqliteStore.getBookmark(url);
      var oldIcon = bookmark.icon;

      if (oldIcon.indexOf("data:image/") != 0 && favIconUrl) {
        var IOSVC = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var chan = IOSVC.newChannel(favIconUrl, null, null);
        var listener = null;
        listener = new bookmarksFavIconLoadListener(url, favIconUrl, chan);
        
        chan.notificationCallbacks = listener;
        chan.asyncOpen(listener, null);
        return true;
      }
    }
    return false;
  } catch (e) {
    yDebug.print("loadFavIconNew failed: " + e);
    return false;
  }
}

//check for FF version
function bookmarksFavIconLoadListener(uri, faviconurl, channel) {
  this.mURI = uri;
  this.mFavIconURL = faviconurl;
  this.mCountRead = 0;
  this.mChannel = channel;
}

bookmarksFavIconLoadListener.prototype = {
  mURI : null,
  mFavIconURL : null,
  mCountRead : null,
  mChannel : null,
  mBytes : Array(),
  mStream : null,

  QueryInterface: function (iid) {
    if (!iid.equals(Components.interfaces.nsISupports) &&
        !iid.equals(Components.interfaces.nsIInterfaceRequestor) &&
        !iid.equals(Components.interfaces.nsIRequestObserver) &&
        !iid.equals(Components.interfaces.nsIChannelEventSink) &&
        !iid.equals(Components.interfaces.nsIProgressEventSink) && // see below
        !iid.equals(Components.interfaces.nsIStreamListener)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
  },

  // nsIInterfaceRequestor
  getInterface: function (iid) {
    try {
      return this.QueryInterface(iid);
    } catch (e) {
      throw Components.results.NS_NOINTERFACE;
    }
  },

  // nsIRequestObserver
  onStartRequest : function (aRequest, aContext) {
    this.mStream = Components.classes['@mozilla.org/binaryinputstream;1'].createInstance(Components.interfaces.nsIBinaryInputStream);
  },

  onStopRequest : function (aRequest, aContext, aStatusCode) { 
    var httpChannel = this.mChannel.QueryInterface(Components.interfaces.nsIHttpChannel);
    if ((httpChannel && httpChannel.requestSucceeded) &&
        Components.isSuccessCode(aStatusCode) &&
        this.mCountRead > 0)
    {
        
        var dataurl;
        // get us a mime type for this
        var mimeType = null;

        //NOTE: added this code because getMIMETypeFromContent method is changed in FF3
        const nsICategoryManager = Components.interfaces.nsICategoryManager;
        const nsIContentSniffer = Components.interfaces.nsIContentSniffer;
        var catMgr = Components.classes["@mozilla.org/categorymanager;1"].getService(nsICategoryManager);
        var sniffers = catMgr.enumerateCategory("content-sniffing-services");
        while (mimeType == null && sniffers.hasMoreElements()) {
          var snifferCID = sniffers.getNext().QueryInterface(Components.interfaces.nsISupportsCString).toString();
          var sniffer = Components.classes[snifferCID].getService(nsIContentSniffer);

          try {
            mimeType = sniffer.getMIMETypeFromContent (aRequest, this.mBytes, this.mCountRead);
          } catch (e) {
            mimeType = null;
            // ignore
          }
        }

         if (mimeType) {
          var text = "data:" + mimeType + ";base64," + gYB_b64(this.mBytes);

          gYB_sqliteStore.setStringPropertyForBookmark(this.mURI, "icon", text);
         
          var os = Components.classes["@mozilla.org/observer-service;1"].
                  getService(Components.interfaces.nsIObserverService);
          var notifyData = this.mURI +" "+ text;
          os.notifyObservers(null, "ybookmark.faviconLoaded", notifyData);
        }
    }

    this.mChannel = null;
  },

  // nsIStreamObserver
  onDataAvailable : function (aRequest, aContext, aInputStream, aOffset, aCount) {
    // we could get a different aInputStream, so we don't save this;
    // it's unlikely we'll get more than one onDataAvailable for a
    // favicon anyway
    this.mStream.setInputStream(aInputStream);

    var chunk = this.mStream.readByteArray(aCount);
    this.mBytes = this.mBytes.concat(chunk);
    this.mCountRead += aCount;
  },

  // nsIChannelEventSink
  onChannelRedirect : function (aOldChannel, aNewChannel, aFlags) {
    this.mChannel = aNewChannel;
  },
  
  asyncOnChannelRedirect : function (oldChannel, newChannel, flags, callback) {
	    this.onChannelRedirect(oldChannel, newChannel, flags);
	    callback.onRedirectVerifyCallback(0);
  },
    
  // nsIProgressEventSink: the only reason we support
  // nsIProgressEventSink is to shut up a whole slew of xpconnect
  // warnings in debug builds.  (see bug #253127)
  onProgress : function (aRequest, aContext, aProgress, aProgressMax) { },
  onStatus : function (aRequest, aContext, aStatus, aStatusArg) { }
}
