Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const nsISupports = Components.interfaces.nsISupports;
const nsIYDelLocalStore = Components.interfaces.nsIYDelLocalStore;

// You can change these if you like
const CLASS_ID = Components.ID("96057d87-098d-4ad0-9e99-9870bbade0c8");
const CLASS_NAME = "Delicious Local Store";
const CONTRACT_ID = "@yahoo.com/nsYDelLocalStore;1";

const kHashPropertyBagContractID = "@mozilla.org/hash-property-bag;1";
const kIWritablePropertyBag = Components.interfaces.nsIWritablePropertyBag;
const HashPropertyBag = new Components.Constructor(kHashPropertyBagContractID,
                                                   kIWritablePropertyBag);
const kStringContractID = "@mozilla.org/supports-string;1";
const kIString = Components.interfaces.nsISupportsString;
const NSString = new Components.Constructor(kStringContractID, kIString);

const kMutableArrayContractID = "@mozilla.org/array;1";
const kIMutableArray = Components.interfaces.nsIMutableArray;
const NSArray = new Components.Constructor(kMutableArrayContractID,
                                           kIMutableArray);
                                           
const nsTimer = "@mozilla.org/timer;1";
const nsITimer = Components.interfaces.nsITimer;

var CC = Components.classes;
var CI = Components.interfaces;

const kIOContractID = "@mozilla.org/network/io-service;1";
const kIOIID = CI.nsIIOService;
const IOSVC = CC[kIOContractID].getService(kIOIID);

const kRSS10_NAMESPACE_URI  = "http://purl.org/rss/1.0/";
const kRSS09_NAMESPACE_URI  = "http://my.netscape.com/rdf/simple/0.9/";
const gRDF_NS               = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

const FAVTAGS_ORDER_CHRONO = "0";
const FAVTAGS_ORDER_CHRONO_REVERSE = "1";
const FAVTAGS_ORDER_ALPHANUM = "2";
const FAVTAGS_ORDER_ALPHANUM_REVERSE = "3";
const FAVTAGS_ORDER_MOST_VISITED = "4";
const FAVTAGS_ORDER_USER = "user";

const FAVTAGS_ORDER_DEFAULT = FAVTAGS_ORDER_CHRONO_REVERSE;

var gRdfService = CC["@mozilla.org/rdf/rdf-service;1"].
                      getService(Components.interfaces.nsIRDFService);
var gRdfContainerUtils = CC["@mozilla.org/rdf/container-utils;1"].
                        getService(CI.nsIRDFContainerUtils);

var grscType = gRdfService.GetResource(gRDF_NS + "type");
var grscRSS09Item = gRdfService.GetResource(kRSS09_NAMESPACE_URI + "item");
var grscRSS09Channel = gRdfService.GetResource(kRSS09_NAMESPACE_URI
  + "channel");
var grscRSS09Title = gRdfService.GetResource(kRSS09_NAMESPACE_URI + "title");
var grscRSS09Link = gRdfService.GetResource(kRSS09_NAMESPACE_URI + "link");

var grscRSS10Items = gRdfService.GetResource(kRSS10_NAMESPACE_URI + "items");
var grscRSS10Channel = gRdfService.GetResource(kRSS10_NAMESPACE_URI
  + "channel");
var grscRSS10Title = gRdfService.GetResource(kRSS10_NAMESPACE_URI + "title");
var grscRSS10Link = gRdfService.GetResource(kRSS10_NAMESPACE_URI + "link");

  
/**
 * Load required js files
 */
( ( CC["@mozilla.org/moz/jssubscript-loader;1"] ).getService( 
     CI.mozIJSSubScriptLoader ) ).loadSubScript( 
        "chrome://ybookmarks/content/yDebug.js" ); 

( ( CC["@mozilla.org/moz/jssubscript-loader;1"] ).getService( 
     CI.mozIJSSubScriptLoader ) ).loadSubScript( 
        "chrome://ybookmarks/content/ybookmarksUtils.js" );

( ( CC["@mozilla.org/moz/jssubscript-loader;1"] ).getService( 
     CI.mozIJSSubScriptLoader ) ).loadSubScript( 
        "chrome://ybookmarks/content/json.js" );

/**
 * bookmarks favicon load listener
 * @param {} uri
 * @param {} faviconurl
 * @param {} channel
 */
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
    try {
    	
    	var sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
						getService(Components.interfaces.nsIYDelLocalStore);
	    try {
	      var httpChannel = this.mChannel.QueryInterface(Components.interfaces.nsIHttpChannel);
	    //yDebug.print("DelLocalStore::bookmarksFavIconLoadListener::onStopRequest:Url-"+this.mURI, YB_LOG_MESSAGE);
	    } catch(e) {
	      httpChannel = null;
	    }
	    
	    try {
	    	var responseStatus = httpChannel.responseStatus;
	    	//yDebug.print("DelLocalStore::bookmarksFavIconLoadListener::onStopRequest:Status-"+httpChannel.responseStatus, YB_LOG_MESSAGE);
	    } catch(e) {
	    	//yDebug.print("DelLocalStore::bookmarksFavIconLoadListener::onStopRequest:Status-Thrown Exception", YB_LOG_MESSAGE);
	    	responseStatus = null;
	    }
	    
	    if ((httpChannel) &&
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
	        var i=0;
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
	        
	        //yDebug.print("DelLocalStore::bookmarksFavIconLoadListener::onStopRequest:mimeType-"+mimeType, YB_LOG_MESSAGE);
	        
	         if (mimeType) {	// JGP 2011/05/26	Seeing several icons not appear because they are not .png or .ico	
//	         if (mimeType == "image/x-icon" || mimeType == "image/png") {
	          var text = "data:" + mimeType + ";base64," + ybookmarksUtils.base64Encode(this.mBytes);
	          sqliteStore.setStringPropertyForBookmark(this.mURI, "icon", text);
	         
	          var os = Components.classes["@mozilla.org/observer-service;1"].
	                  getService(Components.interfaces.nsIObserverService);
	          var notifyData = this.mURI +" "+ text;
	          os.notifyObservers(null, "ybookmark.faviconLoaded", notifyData);
	        } else {
	          	if(responseStatus == 404 || !responseStatus || !mimeType) sqliteStore.setStringPropertyForBookmark(this.mURI, "icon", "None");
	        }
	    } else {
	    	sqliteStore.setStringPropertyForBookmark(this.mURI, "icon", "None");
	    }

    	this.mChannel = null;
    } catch(e) {
    	yDebug.print("DelLocalStore::bookmarksFavIconLoadListener::onStopRequest:Error-"+e, YB_LOG_MESSAGE);
    }
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
		//yDebug.print("Redirecting to...", YB_LOG_MESSAGE);
		
		if(aNewChannel.URI.schemeIs('https')) {
			aNewChannel = null;
			//yDebug.print("Redirecting to https... cancelling channel.", YB_LOG_MESSAGE);
			throw "Redirecting to secure connection...";
			return;
		}
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

/**
 * Feed listener for loading feed data into SQLite database
 */
function FeedListener(localStore, channel, uri) {
  this._localStore = localStore;
  this._channel = channel;
  this._uri = uri;
  this._countRead = 0;
}

FeedListener.prototype = {
  _uri : null,
  _localStore : null,
  _countRead : null,
  _channel : null,
  _data : Array(),
  _stream : null,

  QueryInterface: function (iid) {
    if (!iid.equals(Components.interfaces.nsISupports) &&
        !iid.equals(Components.interfaces.nsIInterfaceRequestor) &&
        !iid.equals(Components.interfaces.nsIRequestObserver) &&
        !iid.equals(Components.interfaces.nsIChannelEventSink) &&
        !iid.equals(Components.interfaces.nsIProgressEventSink) && // see below
        !iid.equals(Components.interfaces.nsIWebProgress) && // see below
        !iid.equals(Components.interfaces.nsIStreamListener)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
  },

  // nsIProgressEventSink: the only reason we support
  // nsIProgressEventSink is to shut up a whole slew of xpconnect
  // warnings in debug builds.  (see bug #253127)
  onProgress : function (aRequest, aContext, aProgress, aProgressMax) { },
  onStatus : function (aRequest, aContext, aStatus, aStatusArg) { },
  addProgressListener : function(listener , notifyMask ) { },
  removeProgressListener : function(listener) { },


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
    this._stream = CC['@mozilla.org/binaryinputstream;1'].
      createInstance(CI.nsIBinaryInputStream);
  },

  onStopRequest : function (aRequest, aContext, aStatusCode) {
    try {
      //Delete all livebookmarks and add Update failed livebookmark
      if (aStatusCode != 0) {
          this._localStore.deleteAllLiveBookmarks(this._uri);
          this._localStore.addLiveBookmark(this._uri, "Update failed", "about:livemarks");
      } else {
        
        //Delete all existing livebookmarks
        this._localStore.deleteAllLiveBookmarks(this._uri);
        
        //Parse data
        var p = CC["@mozilla.org/xmlextras/domparser;1"].
            createInstance(CI.nsIDOMParser);      
        var doc = p.parseFromBuffer(this._data, this._countRead, "text/xml");    
        
        //Try parsing as RSS and RDF
        if (!this._trySimpleRss(doc) && !this._tryAsRDF(doc)) {
            this._localStore.addLiveBookmark(this._uri, "Update failed", "about:livemarks");
        } else {
            yDebug.print("Livemark " + this._uri + " updated", YB_LOG_MESSAGE);
        }

        var ttl = 3600 * 1000; // By default reload after 1 hour.

        var channel = aRequest.QueryInterface(CI.nsICachingChannel);
        if (channel) {
            var cei = channel.cacheToken.QueryInterface(CI.nsICacheEntryInfo);
            if (cei) {
                var now = new Date();
                var expirationTime = (1000 * cei.expirationTime) - now.getTime();
                if (expirationTime > ttl) {
                    ttl = expirationTime;
                }
            }
        }
        var t = (new Date(new Date().getTime() + ttl)).getTime() * 1000;
        this._localStore.setNumericPropertyForBookmark(this._uri, "expiration_time", t);
        this._channel = null;
      }
    } catch (e) {
      yDebug.print("YDelLocalStore::onStopRequest: Error"+e, YB_LOG_MESSAGE);
    }
  },

  // nsIStreamObserver
  onDataAvailable : function (aRequest, aContext, aInputStream,
    aOffset, aCount) {
    try {
        this._stream.setInputStream(aInputStream);
        var chunk = this._stream.readByteArray(aCount);
        this._data = this._data.concat(chunk);
        this._countRead += aCount;
    } catch (e) {
      logError("onDataAvailable", e);
    }
  },

  // nsIChannelEventSink
  onChannelRedirect : function (aOldChannel, aNewChannel, aFlags) {
    this._channel = aNewChannel;
  },
  
  asyncOnChannelRedirect : function (oldChannel, newChannel, flags, callback) {
	    this.onChannelRedirect(oldChannel, newChannel, flags);
	    callback.onRedirectVerifyCallback(0);
  },

  _tryAsRDF : function(doc) {
    var serializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
        .createInstance(Components.interfaces.nsIDOMSerializer);
    var xmlString=serializer.serializeToString(doc.documentElement);
    var ds = CC["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"].
      createInstance(CI.nsIRDFDataSource);
    var rdfXmlParser = CC["@mozilla.org/rdf/xml-parser;1"].
      createInstance(CI.nsIRDFXMLParser);
    var uri = CC["@mozilla.org/network/io-service;1"].
      getService(CI.nsIIOService).newURI(this._uri, null, null);
    rdfXmlParser.parseString(ds, uri, xmlString);
    var channelResource = ds.GetSource(grscType, grscRSS10Channel, true);
    
    
    if (channelResource) {
      return this._processRDF10(ds, channelResource);
    } else {
      channelResource = ds.GetSource(grscType, grscRSS09Channel, true);
      if (channelResource) {
        return this._processRDF09(ds, channelResource);
      }
      
      return false;
    }
  },

  _processRDF10 : function(datasource, channelResource) {
    var itemsNode = datasource.GetTarget(channelResource, grscRSS10Items, true);
    if (itemsNode) {
      this._populateChildren(datasource,
        gRdfContainerUtils.MakeSeq(datasource, itemsNode).GetElements(),
        grscRSS10Title, grscRSS10Link);
      return true;
    }
    return false;
  },

  _processRDF09 : function(datasource, channelResource) {
    this._populateChildren(datasource,
      datasource.GetSources(grscType, grscRSS09Item, true),
      grscRSS09Title, grscRSS09Link);
    return true;
  },

  _populateChildren : function(datasource, enumerator,
    titleResource, linkResource) {
    while (enumerator.hasMoreElements()) {
      var r = enumerator.getNext().QueryInterface(CI.nsIRDFResource);
      var title = datasource.GetTarget(r, titleResource, true);
      var link = datasource.GetTarget(r, linkResource, true);
      if (title && link) {
        this._newLivemarkBookmark(title.QueryInterface(CI.nsIRDFLiteral).Value,
          link.QueryInterface(CI.nsIRDFLiteral).Value);
      }
    }
  },

  _trySimpleRss : function(doc) {
    if (! doc.documentElement) {
      return false;
    }
    var lookingForChannel = false;
    var node = doc.firstChild;
    var isAtom = false;
    while (node) {
      if (node.nodeType == CI.nsIDOMNode.ELEMENT_NODE) {
        var name = node.nodeName;
        if (lookingForChannel) {
          if (name == "channel") {
            break;
          }
        } else {
          if (name == "rss") {
            node = node.firstChild;
            lookingForChannel = true;
            continue;
          } else if (name == "feed") {
            isAtom = true;
            break;
          }
        }
      }
      node = node.nextSibling;
    }
    
    if (! node) {
      return false;
    }
    var chElement = node.QueryInterface(CI.nsIDOMElement);

    node = chElement.firstChild;
    while (node) {
      if (node.nodeType == CI.nsIDOMNode.ELEMENT_NODE) {
        name = node.nodeName;
        if (isAtom && (name == "entry")) {
          this._processEntry(node);
        } else if (!isAtom && (name == "item")) {
          this._processItem(node);
        }
      }
      node = node.nextSibling;
    }
    return true;
  },

  _processEntry : function(node) {
    // TODO: Implement handler for feeds. (rather than channels)
    var titleString = "", dateString = "", linkString = "";

    var childNode = node.firstChild;
    while (childNode) {
      if (childNode.nodeType == CI.nsIDOMNode.ELEMENT_NODE) {
        childNode.QueryInterface(CI.nsIDOMElement);
        var childName = childNode.nodeName;
        if (childName == "title") {
          var titleMode = childNode.getAttribute("mode");
          var titleType = childNode.getAttribute("type");
          if (titleMode == "base64") {
            // No one does this in <title> except standards pendats making
            // test feeds, Atom 0.3 is deprecated and RFC 4287 doesn't allow it
            break;
          } else if ((titleType == "text")
            || (titleType == "text/plain")
            || ! titleType) {
            titleString = this._getTextContents(childNode);
          } else if ((titleType == "html")
            || ((titleType == "text/html") && (titleType != "xml"))
            || (titleMode == "escaped")) {
              titleString = this._getTextContents(childNode);
          } else if ((titleType == "xhtml")
            || (titleType == "application/xhtml")
            || (titleMode == "xml")) {
            titleString = this._getTextContents(childNode);
          } else {
            titleString = this._getTextContents(childNode);
          }
        } else if (childName == "link" && !linkString) {
          var rel = childNode.getAttribute("rel");
          if (! rel || rel == "alternate") {
            linkString = childNode.getAttribute("href");
          }
        } else if (!dateString &&
          ((childName == "pubDate") || (childName == "updated"))) {
            dateString = this._getTextContents(childNode);
        }
      }

      childNode = childNode.nextSibling;
    }
    if (! titleString && dateString) {
      titleString = dateString;
    }

    if (titleString && linkString) {
      this._newLivemarkBookmark(titleString, linkString);
    }

  },

  _processItem : function(node) {
    var titleString = "", dateString = "", linkString = "";

    var childNode = node.firstChild;
    while (childNode) {
      if (childNode.nodeType == CI.nsIDOMNode.ELEMENT_NODE) {
        childNode.QueryInterface(CI.nsIDOMElement);
        var childName = childNode.nodeName;
        if (childName == "title") {
          titleString = this._getTextContents(childNode);
        } else if (childName == "link" && !linkString) {
          linkString = this._getTextContents(childNode);
        } else if (childName == "guid" && !linkString) {
          if (childNode.getAttribute("isPermaLink") != "false") {
            linkString = this._getTextContents(childNode);
          }
        } else if (!dateString &&
          ((childName == "pubDate") || (childName == "updated"))) {
            dateString = this._getTextContents(childNode);
        }
      }

      childNode = childNode.nextSibling;
    }
    if (! titleString && dateString) {
      titleString = dateString;
    }

    if (titleString && linkString) {
      this._newLivemarkBookmark(titleString, linkString);
    }

  },

  _newLivemarkBookmark : function(titleString, linkString) {
    this._localStore.addLiveBookmark(this._uri, titleString, linkString);
  },

  _getTextContents : function(node) {
    var result = "";
    var doc = node.ownerDocument;
    doc.QueryInterface(CI.nsIDOMDocumentTraversal);
    var treeWalker = doc.createTreeWalker(node,
      CI.nsIDOMNodeFilter.SHOW_TEXT | CI.nsIDOMNodeFilter.SHOW_CDATA_SECTION,
      null, true);
    var curNode = treeWalker.currentNode;
    while (curNode) {
      try {
        curNode.QueryInterface(CI.nsIDOMCharacterData);
        result += curNode.data;
      } catch (e) {
      }
      curNode = treeWalker.nextNode();
    }
    return result;
  }
}


//mozIStorageStatement wrapper
function ybMozStorageStatement(mozStorageStatement) {
  if(mozStorageStatement.constructor == ybMozStorageStatement)
    return mozStorageStatement;
  
  this.execute = function ybExecute() {
    try {
      return mozStorageStatement.execute();
    } catch(e) {
      ybookmarksUtils.processDBException(e);
      mozStorageStatement.reset();
    }
  };
  
  this.executeStep = function ybExecuteStep() {
    try {
      return mozStorageStatement.executeStep();
    } catch(e) {
      ybookmarksUtils.processDBException(e);
      mozStorageStatement.reset();
    }
  };

  this.constructor = ybMozStorageStatement;
  this.__proto__ = mozStorageStatement;
}


//mozIStorageConnection wrapper

function ybMozStorageConnection(connection) {
  if (connection.constructor == ybMozStorageConnection)
    return connection;

  this.createStatement = function ybCreateStatement(sql) {
    try {
      return new ybMozStorageStatement(connection.createStatement(sql));
    } catch (e) {
      ybookmarksUtils.processDBException(e);
      yDebug.print("ybMozStorageConnection:createStatement Exception::" + e, YB_LOG_MESSAGE);
      //this.logMoreDetails();
    }
  };

  this.executeSimpleSQL = function ybExecuteSimpleSQL(sql) {
    try {
      connection.executeSimpleSQL(sql);
    } catch (e) {
      ybookmarksUtils.processDBException(e);
      yDebug.print("ybMozStorageConnection:executeSimpleSQL Exception::" + e, YB_LOG_MESSAGE);
    }
  };
  
  this.tableExists = function ybTableExists(tableName) {
    try {
      connection.tableExists(tableName);
    } catch(e) {
      ybookmarksUtils.processDBException(e);
      yDebug.print("ybMozStorageConnection:tableExists Exception::" + e, YB_LOG_MESSAGE);      
    }
  };
  /*
  this.logMoreDetails = function() {
    yDebug.print("lastErrorString:" + connection.lastErrorString + " sql:" + sql, YB_LOG_MESSAGE);
  }
  */
  this.constructor = ybMozStorageConnection;
  this.__proto__ = connection;

};


// This is constructor.
// 
function nsYDelLocalStore() {
    this._dbFile = null; //Holds file object
    this._dbFileName = null;
    this._storageService = CC["@mozilla.org/storage/service;1"]
                       .getService(CI.mozIStorageService);
    this._dbConn = null;
    this._favTagsFile = null;
    this._favTags = null;
    this._initialized = false;
}

// This is the implementation of your component.
nsYDelLocalStore.prototype = {
	//nsISupports
	classDescription: CLASS_NAME,
	contractID: CONTRACT_ID,
	classID: CLASS_ID,
	QueryInterface: XPCOMUtils.generateQI([nsIYDelLocalStore]),
	
    _allowDeleteAllBookmarks : false,  //should we delete all bookmarks?
    
    /**
     * Prepares DB for use and creates db connection
     */
	init: function(fileName){
	    try {
		if(!fileName) return;
		if(this._initialized && (this._dbFileName == fileName) ) {
		    return;
		}
				
		this._dbFileName = fileName;
		var pref = Components.classes["@mozilla.org/preferences-service;1"].
							   getService(Components.interfaces.nsIPrefBranch);
		var corruptStore = false;
		try {
		  corruptStore = pref.getBoolPref("extensions.ybookmarks@yahoo.extension.localstore.corrupt");
		  if(corruptStore) {
		    yDebug.print("YDelLocalStore::Init(): DB corrupted pref set, Going to re-create it.", YB_LOG_MESSAGE);
		    pref.setBoolPref("extensions.ybookmarks@yahoo.extension.localstore.corrupt", false);
		  }
		} catch(e){}
		this.createDB(fileName, corruptStore);
		//Open the DB
		try {
		  this._dbConn = this._storageService.openDatabase(this._dbFile);
		} catch(e) {
		  yDebug.print("YDelLocalStore::Init() fatal error opening DB: " + e, YB_LOG_MESSAGE);
		  if(e.result == Components.results.NS_ERROR_FILE_CORRUPTED) {
		      yDebug.print("YDelLocalStore::Init() fatal error: DB Corrupted, Going to re-create it.", YB_LOG_MESSAGE);
		      this.createDB(fileName, true);
		      this._dbConn = this._storageService.openDatabase(this._dbFile);
		      try {
			pref.setBoolPref("extensions.ybookmarks@yahoo.extension.localstore.corrupt", false);
		      } catch(e) {}
		  }
		}
		
		this._dbConn.executeSimpleSQL("PRAGMA synchronous = OFF;");
	
		if (this._dbConn.connectionReady) {
		    this.createTables();
		    this.createViews();	    
		    this.createIndices();
		    /**
		     * Setup commonly used SQL statements
		     */
		    this.setupSQLStatements();
		    this.migrateTransactions();
		    //Insert/Update db version
		    //NOTE: Increment the version number on DB schema change
		    this._dbConn.executeSimpleSQL("REPLACE INTO prefs VALUES ('DB_SCHEMA_VERSION', '0.004')");			
		    this._allowDeleteAllBookmarks = true;
		}
		/* Delete all data if lastupdatetime == -100, this is to work around 
		 * the inability to delete the file on uninstall
		 */
		if(this.getLastUpdateTime() == "-100") {
		  this.clearLocalStore("uninstall");
		}
		
		//Add favorite tags file
		// get profile directory
		this._favTagsFile = CC["@mozilla.org/file/directory_service;1"]
			 .getService(CI.nsIProperties).get("ProfD", CI.nsIFile);
		if(this._favTagsFile) {
		  this._favTagsFile.append("favoriteTags.txt");
		  if( !this._favTagsFile.exists() ) {   // if it doesn't exist, create
		      this._favTagsFile.create(CI.nsIFile.NORMAL_FILE_TYPE, 0600);
		  }
		}

		//Read all favorite tags
		this._favTags = this._readTextFile(this._favTagsFile);
		//clean completed transactions
		this.removeAllTransactions(2);
		this._initialized = true;            
		//this._updateAllLivemarks();
		this.startTimer();
	    } catch (e) {
		ybookmarksUtils.processDBException(e);
		yDebug.print("YDelLocalStore::Init() Error: "+e, YB_LOG_MESSAGE);
	    }
	},
      	
	startTimer : function() {
	    try {
		    if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC) {
		        return;
		    }
		    
	        if (!this._timer) {
              this._timer = CC[nsTimer].createInstance(nsITimer);
            } else {
              this._timer.cancel();
            }
		    var refreshInterval = 5;     
		    try {     
		      refreshInterval = pref.getIntPref("extensions.ybookmarks@yahoo.livemarkUpdate.interval");
		    } catch(e) {}		    		    		    
            this._timer.initWithCallback(this, refreshInterval * 60 * 1000,
                CI.nsITimer.TYPE_REPEATING_SLACK);
            yDebug.print("YDelLocalStore::startTime Timer initiated", YB_LOG_MESSAGE);
        } catch(e) {
            yDebug.print("YDelLocalStore::startTimer Error: " + e, YB_LOG_MESSAGE);
        }
	},
	
	/**
	 * Creates DB file
	 */
	createDB: function(fileName, deleteExisting){
	    try {
	      var dirService = 
		  ( CC[ "@mozilla.org/file/directory_service;1" ] ).getService( 
		      CI.nsIProperties );
	      this._dbFile = 
		  dirService.get( "ProfD", CI.nsILocalFile );
	      this._dbFile.append( fileName );
	      if( !this._dbFile.exists() ) {
		  this._dbFile.create( CI.nsIFile.NORMAL_FILE_TYPE, 0600 );
	      } else if( deleteExisting ) {
		  this._dbFile.remove(true);
		  this._dbFile.create( CI.nsIFile.NORMAL_FILE_TYPE, 0600 );
	      }
	    } catch(e) {
		yDebug.print("YDelLocalStore: Error creating db file", YB_LOG_MESSAGE);
	    }
	},
	
	/**
	 * Creates tables
	 */
	createTables: function(){
        var bookmarksTableName = "bookmarks";
        var bookmarksTableSchema = 'name NOT NULL DEFAULT "" COLLATE NOCASE,' + 
                                    'url NOT NULL DEFAULT "",' +
                                    'type NOT NULL DEFAULT "bookmark",' +
                                    'description NOT NULL DEFAULT "",' +
                                    'hash NOT NULL DEFAULT "",' +
                                    'meta_hash NOT NULL DEFAULT "",' +
                                    'last_visited UNSIGNED NOT NULL DEFAULT 0,' +
                                    'last_modified UNSIGNED NOT NULL DEFAULT 0,' +
                                    'added_date UNSIGNED NOT NULL DEFAULT 0,' +
                                    'visit_count UNSIGNED NOT NULL DEFAULT 0,' +
                                    'icon NOT NULL DEFAULT "",' +
                                    'shortcut NOT NULL DEFAULT "",' +
                                    'post_data NOT NULL DEFAULT "",' +
                                    'shared NOT NULL DEFAULT "true",' +
                                    'local_only NOT NULL DEFAULT "false",' +
                                    'expiration_time UNSIGNED NOT NULL DEFAULT 0';
        var tagsTableName = "tags";
        var tagsTableSchema = 'name NOT NULL DEFAULT "" COLLATE NOCASE';
        var bookmarksTagsTableName = "bookmarks_tags";
        var bookmarksTagsTableSchema = "bookmark_id UNSIGNED NOT NULL DEFAULT 0, tag_id UNSIGNED NOT NULL DEFAULT 0";
        var bundlesTableName = "bundles";
        var bundlesTableSchema = "name NOT NULL DEFAULT '' UNIQUE COLLATE NOCASE, order_type UNSIGNED NOT NULL DEFAULT 0, position UNSIGNED NOT NULL DEFAULT 0, tags NOT NULL DEFAULT ''";
        
        var liveBookmarksTable = "live_bookmarks";
        var liveBookmarksSchema = 'feed_url NOT NULL DEFAULT "", title NOT NULL DEFAULT "", url NOT NULL DEFAULT ""';
        
        var transactionsTableName = "transactions";
	var newTransactionsTableName = "transactions_new";//new table for transactions, schema remains the same.
        //action = {addBookmark, editBookmark, deleteBookmark, setBundle, deleteBundle
        //state = {0 - uninitialized, 1 - sent, 2 - completed, 3 - failed}
        var transactionsTableSchema = "action, state UNSIGNED NOT NULL DEFAULT 0, type, data, txn_time UNSIGNED NOT NULL DEFAULT 0";
        
        var prefsTable = "prefs";
        var prefsSchema = "name NOT NULL DEFAULT '' UNIQUE, value";
        
        var urlVisitsTable = "url_visits";
        var urlVisitsSchema = 'url NOT NULL DEFAULT "" UNIQUE, visit_count UNSIGNED NOT NULL DEFAULT 0, last_visited UNSINGED NOT NULL DEFAULT 0';
        
        //recipients (send to friends providers) table
        var recipientsTable = "recipients";
        var recipientsSchema = "provider NOT NULL DEFAULT 'delicious', recipient NOT NULL DEFAULT '' COLLATE NOCASE, last_used UNSIGNED NOT NULL DEFAULT 0, frequency UNSIGNED NOT NULL DEFAULT 0,  UNIQUE (provider, recipient)";

        // providers username
        var providerCredTable = "provider_creds";
        var providerCredSchema = "provider NOT NULL DEFAULT '' UNIQUE, username NOT NULL DEFAULT '', auth_status NOT NULL DEFAULT 'false', auto_send_public NOT NULL DEFAULT 'false'";

        /* No longer required, was used by old transactions
	// send message in bookmarks 
        var bkmsMsgTable = "bookmarks_messages";
        var bkmsMsgSchema = "bookmark_id UNSINGED NOT NULL DEFAULT 0, msg NOT NULL DEFAULT ''";
        
        // bkms providers
        var bkmsRecipientsTable = "bookmarks_recipients";
        var bkmsRecipientsSchema = "bookmark_id UNSIGNED NOT NULL DEFAULT 0, recipient_id UNSIGNED NOT NULL DEFAULT 0";
	*/
        //create tables and prepare commonly used statements
        try {
            
            /**
             * Create bookmarks table
             */
            if(!this._dbConn.tableExists(bookmarksTableName)) this._dbConn.createTable(bookmarksTableName, bookmarksTableSchema);
            
            /**
             * Create tags table
             */
            if(!this._dbConn.tableExists(tagsTableName))this._dbConn.createTable(tagsTableName, tagsTableSchema);
            
            /**
             * Create bookmarks-tags table
             */
            if(!this._dbConn.tableExists(bookmarksTagsTableName))this._dbConn.createTable(bookmarksTagsTableName, bookmarksTagsTableSchema);
            
            /**
             * Create bundles table
             */
            if(!this._dbConn.tableExists(bundlesTableName))this._dbConn.createTable(bundlesTableName, bundlesTableSchema);
            
            /**
             * Create transactions table
             */
            if(!this._dbConn.tableExists(newTransactionsTableName))this._dbConn.createTable(newTransactionsTableName, transactionsTableSchema);

            
            /**
             * Create live bookmarks table
             */
            if(!this._dbConn.tableExists(liveBookmarksTable))this._dbConn.createTable(liveBookmarksTable, liveBookmarksSchema);
            
            /**
             * Create prefs table
             */
            if(!this._dbConn.tableExists(prefsTable))this._dbConn.createTable(prefsTable, prefsSchema);

            /**
             * Create url visits table
             */
            if(!this._dbConn.tableExists(urlVisitsTable))this._dbConn.createTable(urlVisitsTable, urlVisitsSchema);
            
            if(!this._dbConn.tableExists(recipientsTable))this._dbConn.createTable(recipientsTable, recipientsSchema);
            
            if(!this._dbConn.tableExists(providerCredTable))this._dbConn.createTable(providerCredTable, providerCredSchema);
            
            /*          ///////Old transaction used these tables.///////
	    if(!this._dbConn.tableExists(bkmsMsgTable))this._dbConn.createTable(bkmsMsgTable, bkmsMsgSchema);
            
            if(!this._dbConn.tableExists(bkmsRecipientsTable))this._dbConn.createTable(bkmsRecipientsTable, bkmsRecipientsSchema);
	    */


        } catch(e) {
            yDebug.print("YDelLocalStore::Create Tables: Error "+e, YB_LOG_MESSAGE);
	    ybookmarksUtils.processDBException(e);
        }
	},
	
	/**
	 * Creates views
	 */
	createViews: function() {
    try {
    } catch(e) {
        yDebug.print("YDelLocalStore::createViews::Error-"+e, YB_LOG_MESSAGE);
    }
	},
	
	/**
	 * Creats indices on table columns
	 */
	createIndices: function () {
        try {
            this._dbConn.executeSimpleSQL("CREATE INDEX IF NOT EXISTS bookmarks_alpha ON bookmarks(type, name ASC)");
            this._dbConn.executeSimpleSQL("CREATE INDEX IF NOT EXISTS bookmarks_site ON bookmarks(type, url ASC)");
            this._dbConn.executeSimpleSQL("CREATE INDEX IF NOT EXISTS bookmarks_added_date ON bookmarks(type, added_date DESC, name)");
            this._dbConn.executeSimpleSQL("CREATE INDEX IF NOT EXISTS bookmarks_most_visited ON bookmarks(type, visit_count DESC, name)");
            this._dbConn.executeSimpleSQL("CREATE INDEX IF NOT EXISTS bookmarks_last_visited ON bookmarks(type, last_visited DESC, name)");
            
            this._dbConn.executeSimpleSQL("CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks_tags (bookmark_id, tag_id)");
            this._dbConn.executeSimpleSQL("CREATE INDEX IF NOT EXISTS idx_tags_bookmarks ON bookmarks_tags (tag_id, bookmark_id)");
            
            this._dbConn.executeSimpleSQL("CREATE INDEX IF NOT EXISTS idx_feed_url ON live_bookmarks (feed_url)");
            
            this._dbConn.executeSimpleSQL("CREATE INDEX IF NOT EXISTS idx_url ON url_visits (url)");
            
        } catch(e) {
            yDebug.print("YDelLocalStore::CreateIndices::Error-"+e, YB_LOG_MESSAGE);
        }
	},
	
	/**
	 * Setup frequently used sql statements for use
	 */
	setupSQLStatements: function() {
	    try {
	        /**
	         * Statements on bookmarks table
	         */
	        //Insert Bookmark
	        var sqlInsertBookmark = "INSERT INTO bookmarks VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)";
	        this.stmInsertBookmark = this._dbConn.createStatement(sqlInsertBookmark);

			//Update bookmark
			var sqlUpdateBookmark = "UPDATE bookmarks SET name=?1, url=?2, description=?3, shortcut=?4, shared=?5, post_data=?6, local_only=?7 WHERE url=?8";
			this.stmUpdateBookmark = this._dbConn.createStatement(sqlUpdateBookmark);
			
            //Get bookmark rowid
            var selectRowidFromBookmarks = "SELECT rowid FROM bookmarks WHERE";
            
            var sqlGetBookmarkId = selectRowidFromBookmarks+" url = ?1";
            this.stmGetBookmarkId = this._dbConn.createStatement(sqlGetBookmarkId);
            
            //Get bookmark rowid
            var sqlGetBookmarkIdFromShortcut = selectRowidFromBookmarks+" shortcut = ?1";
            this.stmGetBookmarkIdFromShortcut = this._dbConn.createStatement(sqlGetBookmarkIdFromShortcut);

            //Get bookmark url from hash
            var sqlGetBookmarkUrlFromHash = "SELECT url FROM bookmarks WHERE hash = ?1";
            this.stmGetBookmarkUrlFromHash = this._dbConn.createStatement(sqlGetBookmarkUrlFromHash);
            
            //Is bookmarked?
            var sqlIsBookmarked = selectRowidFromBookmarks+" url = ?1";
            this.stmIsBookmarked = this._dbConn.createStatement(sqlIsBookmarked);
            
            //Is livemarked?
            var sqlIsLivemarked = "SELECT rowid FROM live_bookmarks WHERE url = ?1";
            this.stmIsLivemarked = this._dbConn.createStatement(sqlIsLivemarked);
            
            var sqlExpirationTime = "SELECT expiration_time FROM bookmarks WHERE rowid = ?1";
            this.stmExpirationTime =  this._dbConn.createStatement(sqlExpirationTime);
            
            var sqlGetFeedUrl = "SELECT url FROM bookmarks WHERE rowid=?1 AND type='Livemark'";
            this.stmGetFeedUrl =  this._dbConn.createStatement(sqlGetFeedUrl);
            
            var selectAllFromBookmarks = "SELECT bookmarks.rowid, bookmarks.* FROM bookmarks ";
            
            //Get bookmark using bookmark_id
            var sqlGetBookmarkUsingBookmarkId = selectAllFromBookmarks + "WHERE  bookmarks.rowid = ?1";
            this.stmGetBookmarkUsingBookmarkId = this._dbConn.createStatement(sqlGetBookmarkUsingBookmarkId);
            
            //Get bookmarks using tag name
            var sqlGetBookmarksUsingTagByLastAdded = selectAllFromBookmarks + "CROSS JOIN bookmarks_tags ON bookmarks_tags.tag_id=?1 AND bookmarks.rowid = bookmarks_tags.bookmark_id ORDER BY type, added_date DESC, name LIMIT ?2";
            this.stmGetBookmarksUsingTagByLastAdded = this._dbConn.createStatement(sqlGetBookmarksUsingTagByLastAdded);
            var sqlGetBookmarksUsingTagByLastAddedReverse = selectAllFromBookmarks + "CROSS JOIN bookmarks_tags ON bookmarks_tags.tag_id=?1 AND bookmarks.rowid = bookmarks_tags.bookmark_id ORDER BY type, added_date, name LIMIT ?2";
            this.stmGetBookmarksUsingTagByLastAddedReverse = this._dbConn.createStatement(sqlGetBookmarksUsingTagByLastAddedReverse);
            var sqlGetBookmarksUsingTagByMostVisited = selectAllFromBookmarks + "CROSS JOIN bookmarks_tags ON bookmarks_tags.tag_id=?1 AND bookmarks.rowid = bookmarks_tags.bookmark_id ORDER BY type, visit_count DESC, name LIMIT ?2";
            this.stmGetBookmarksUsingTagByMostVisited = this._dbConn.createStatement(sqlGetBookmarksUsingTagByMostVisited);
            var sqlGetBookmarksUsingTagByLastVisited = selectAllFromBookmarks + "CROSS JOIN bookmarks_tags ON bookmarks_tags.tag_id=?1 AND bookmarks.rowid = bookmarks_tags.bookmark_id ORDER BY type, last_visited DESC, name LIMIT ?2";
            this.stmGetBookmarksUsingTagByLastVisited = this._dbConn.createStatement(sqlGetBookmarksUsingTagByLastVisited);
            var sqlGetBookmarksUsingTagBySite = selectAllFromBookmarks + "CROSS JOIN bookmarks_tags ON bookmarks_tags.tag_id=?1 AND bookmarks.rowid = bookmarks_tags.bookmark_id ORDER BY type, url LIMIT ?2";
            this.stmGetBookmarksUsingTagBySite = this._dbConn.createStatement(sqlGetBookmarksUsingTagBySite);
            var sqlGetBookmarksUsingTagByName = selectAllFromBookmarks + "CROSS JOIN bookmarks_tags ON bookmarks_tags.tag_id=?1 AND bookmarks.rowid = bookmarks_tags.bookmark_id ORDER BY type, name LIMIT ?2";
            this.stmGetBookmarksUsingTagByName = this._dbConn.createStatement(sqlGetBookmarksUsingTagByName);
            var sqlGetBookmarksUsingTagByNameReverse = selectAllFromBookmarks + "CROSS JOIN bookmarks_tags ON bookmarks_tags.tag_id=?1 AND bookmarks.rowid = bookmarks_tags.bookmark_id ORDER BY type, name DESC LIMIT ?2";
            this.stmGetBookmarksUsingTagByNameReverse = this._dbConn.createStatement(sqlGetBookmarksUsingTagByNameReverse);
            
            //Get bookmarks using two tags
            var sqlGetBookmarksOf2TagsByLastAdded = "SELECT bookmarks.rowid, bookmarks.* FROM bookmarks, bookmarks_tags WHERE bookmarks.rowid = bookmarks_tags.bookmark_id AND bookmarks_tags.tag_id=?1 AND bookmarks.rowid IN (SELECT bookmark_id FROM bookmarks_tags WHERE tag_id=?2) ORDER BY type, added_date DESC, name LIMIT ?3";
            this.stmGetBookmarksOf2TagsByLastAdded = this._dbConn.createStatement(sqlGetBookmarksOf2TagsByLastAdded);
            var sqlGetBookmarksOf2TagsByLastAddedReverse = "SELECT bookmarks.rowid, bookmarks.* FROM bookmarks, bookmarks_tags WHERE bookmarks.rowid = bookmarks_tags.bookmark_id AND bookmarks_tags.tag_id=?1 AND bookmarks.rowid IN (SELECT bookmark_id FROM bookmarks_tags WHERE tag_id=?2) ORDER BY type, added_date, name LIMIT ?3";
            this.stmGetBookmarksOf2TagsByLastAddedReverse = this._dbConn.createStatement(sqlGetBookmarksOf2TagsByLastAddedReverse);
            var sqlGetBookmarksOf2TagsByMostVisited = "SELECT bookmarks.rowid, bookmarks.* FROM bookmarks, bookmarks_tags WHERE bookmarks.rowid = bookmarks_tags.bookmark_id AND bookmarks_tags.tag_id=?1 AND bookmarks.rowid IN (SELECT bookmark_id FROM bookmarks_tags WHERE tag_id=?2) ORDER BY type, visit_count DESC, name LIMIT ?3";
            this.stmGetBookmarksOf2TagsByMostVisited = this._dbConn.createStatement(sqlGetBookmarksOf2TagsByMostVisited);
            var sqlGetBookmarksOf2TagsByLastVisited = "SELECT bookmarks.rowid, bookmarks.* FROM bookmarks, bookmarks_tags WHERE bookmarks.rowid = bookmarks_tags.bookmark_id AND bookmarks_tags.tag_id=?1 AND bookmarks.rowid IN (SELECT bookmark_id FROM bookmarks_tags WHERE tag_id=?2) ORDER BY type, last_visited DESC, name LIMIT ?3";
            this.stmGetBookmarksOf2TagsByLastVisited = this._dbConn.createStatement(sqlGetBookmarksOf2TagsByLastVisited);
            var sqlGetBookmarksOf2TagsBySite = "SELECT bookmarks.rowid, bookmarks.* FROM bookmarks, bookmarks_tags WHERE bookmarks.rowid = bookmarks_tags.bookmark_id AND bookmarks_tags.tag_id=?1 AND bookmarks.rowid IN (SELECT bookmark_id FROM bookmarks_tags WHERE tag_id=?2) ORDER BY type, url LIMIT ?3";
            this.stmGetBookmarksOf2TagsBySite = this._dbConn.createStatement(sqlGetBookmarksOf2TagsBySite);
            var sqlGetBookmarksOf2TagsByName = "SELECT bookmarks.rowid, bookmarks.* FROM bookmarks, bookmarks_tags WHERE bookmarks.rowid = bookmarks_tags.bookmark_id AND bookmarks_tags.tag_id=?1 AND bookmarks.rowid IN (SELECT bookmark_id FROM bookmarks_tags WHERE tag_id=?2) ORDER BY type, name LIMIT ?3";
            this.stmGetBookmarksOf2TagsByName = this._dbConn.createStatement(sqlGetBookmarksOf2TagsByName);
            var sqlGetBookmarksOf2TagsByNameReverse = "SELECT bookmarks.rowid, bookmarks.* FROM bookmarks, bookmarks_tags WHERE bookmarks.rowid = bookmarks_tags.bookmark_id AND bookmarks_tags.tag_id=?1 AND bookmarks.rowid IN (SELECT bookmark_id FROM bookmarks_tags WHERE tag_id=?2) ORDER BY type, name DESC LIMIT ?3";
            this.stmGetBookmarksOf2TagsByNameReverse = this._dbConn.createStatement(sqlGetBookmarksOf2TagsByNameReverse);

            //Gell all bookmarks from bookmarks table
            var sqlGetAllBookmarksByLastAdded = selectAllFromBookmarks + "ORDER BY type, added_date DESC, name";
            this.stmGetAllBookmarksByLastAdded = this._dbConn.createStatement(sqlGetAllBookmarksByLastAdded);
            var sqlGetAllBookmarksByLastAddedReverse = selectAllFromBookmarks + "ORDER BY type, added_date, name";
            this.stmGetAllBookmarksByLastAddedReverse = this._dbConn.createStatement(sqlGetAllBookmarksByLastAddedReverse);
            var sqlGetAllBookmarksByMostVisited = selectAllFromBookmarks + "ORDER BY type, visit_count DESC, name";
            this.stmGetAllBookmarksByMostVisited = this._dbConn.createStatement(sqlGetAllBookmarksByMostVisited);
            var sqlGetAllBookmarksByLastVisited = selectAllFromBookmarks + "ORDER BY type, last_visited DESC, name";
            this.stmGetAllBookmarksByLastVisited = this._dbConn.createStatement(sqlGetAllBookmarksByLastVisited);
            var sqlGetAllBookmarksBySite = selectAllFromBookmarks + "ORDER BY type, url";
            this.stmGetAllBookmarksBySite = this._dbConn.createStatement(sqlGetAllBookmarksBySite);
            var sqlGetAllBookmarksByName = selectAllFromBookmarks + "ORDER BY type, name";
            this.stmGetAllBookmarksByName = this._dbConn.createStatement(sqlGetAllBookmarksByName);
            var sqlGetAllBookmarksByNameReverse = selectAllFromBookmarks + "ORDER BY type, name DESC";
            this.stmGetAllBookmarksByNameReverse = this._dbConn.createStatement(sqlGetAllBookmarksByNameReverse);
            
            //Search all bookmarks from bookmarks table
            var sqlSearchBookmarksByLastAdded = selectAllFromBookmarks + "WHERE name LIKE ?1 OR url LIKE ?2 OR description LIKE ?3 OR rowid IN (SELECT bt.bookmark_id FROM bookmarks_tags as bt, tags as t WHERE bt.tag_id = t.rowid AND t.name LIKE ?4) ORDER BY type, added_date DESC, name LIMIT ?5";
            this.stmSearchBookmarksByLastAdded = this._dbConn.createStatement(sqlSearchBookmarksByLastAdded);
            var sqlSearchBookmarksByMostVisited = selectAllFromBookmarks + "WHERE name LIKE ?1 OR url LIKE ?2 OR description LIKE ?3 OR rowid IN (SELECT bt.bookmark_id FROM bookmarks_tags as bt, tags as t WHERE bt.tag_id = t.rowid AND t.name LIKE ?4) ORDER BY type, visit_count DESC, name LIMIT ?5";
            this.stmSearchBookmarksByMostVisited = this._dbConn.createStatement(sqlSearchBookmarksByMostVisited);
            var sqlSearchBookmarksByLastVisited = selectAllFromBookmarks + "WHERE name LIKE ?1 OR url LIKE ?2 OR description LIKE ?3 OR rowid IN (SELECT bt.bookmark_id FROM bookmarks_tags as bt, tags as t WHERE bt.tag_id = t.rowid AND t.name LIKE ?4) ORDER BY type, last_visited DESC, name LIMIT ?5";
            this.stmSearchBookmarksByLastVisited = this._dbConn.createStatement(sqlSearchBookmarksByLastVisited);
            var sqlSearchBookmarksBySite = selectAllFromBookmarks + "WHERE name LIKE ?1 OR url LIKE ?2 OR description LIKE ?3 OR rowid IN (SELECT bt.bookmark_id FROM bookmarks_tags as bt, tags as t WHERE bt.tag_id = t.rowid AND t.name LIKE ?4) ORDER BY type, url LIMIT ?5";
            this.stmSearchBookmarksBySite = this._dbConn.createStatement(sqlSearchBookmarksBySite);
            var sqlSearchBookmarksByName = selectAllFromBookmarks + "WHERE name LIKE ?1 OR url LIKE ?2 OR description LIKE ?3 OR rowid IN (SELECT bt.bookmark_id FROM bookmarks_tags as bt, tags as t WHERE bt.tag_id = t.rowid AND t.name LIKE ?4) ORDER BY type, name LIMIT ?5";
            this.stmSearchBookmarksByName = this._dbConn.createStatement(sqlSearchBookmarksByName);

            //get bookmark hashes
            var sqlGetBookmarkHashes = "SELECT hash, meta_hash FROM bookmarks WHERE hash != '' AND meta_hash != ''";
            this.stmGetBookmarkHashes = this._dbConn.createStatement(sqlGetBookmarkHashes);
            
            //get total bookmark count
            var sqlGetBookmarkCount = "SELECT COUNT(rowid) FROM bookmarks";
            this.stmGetBookmarkCount = this._dbConn.createStatement(sqlGetBookmarkCount);
            
            //Remove all rows from bookmarks
            var sqlEmptyBookmarks = "DELETE FROM bookmarks";
            this.stmEmptyBookmarks = this._dbConn.createStatement(sqlEmptyBookmarks);
            
            //Remove from bookmarks with id
            var sqlDeleteBookmarkUsingId = "DELETE FROM bookmarks WHERE rowid = ?1";
            this.stmDeleteBookmarkUsingId = this._dbConn.createStatement(sqlDeleteBookmarkUsingId);
            
            //Delete from bookmarks using url
            var sqlDeleteBookmarkUsingUrl = "DELETE FROM bookmarks WHERE url = ?1";
            this.stmDeleteBookmarkUsingUrl = this._dbConn.createStatement(sqlDeleteBookmarkUsingUrl);
            
            //Update visit count - increment by one
            var sqlIncrementVisitCount = "UPDATE bookmarks SET visit_count = visit_count + 1 WHERE url = ?1";
            this.stmIncrementVisitCount = this._dbConn.createStatement(sqlIncrementVisitCount);
            
            /**
             * Statements on tags table
             */
            //Insert tag
            var sqlInsertTags = "INSERT INTO tags VALUES (?1)";
            this.stmInsertTags = this._dbConn.createStatement(sqlInsertTags);
            
            //Get tag rowid
            var sqlGetTagId = "SELECT rowid FROM tags WHERE name = ?1";
            this.stmGetTagId = this._dbConn.createStatement(sqlGetTagId);
            
            //Get tag rowid for fav tag
            var sqlGetFavTagId = "SELECT rowid FROM tags WHERE lower(name) = ?1";
            this.stmGetFavTagId = this._dbConn.createStatement(sqlGetFavTagId);

            //Get tags using bookmark id            
            var sqlGetTagsUsingBookmarkId = "SELECT bt.tag_id FROM bookmarks_tags as bt WHERE bt.bookmark_id = ?1 ORDER BY bt.rowid";
            this.stmGetTagsUsingBookmarkId = this._dbConn.createStatement(sqlGetTagsUsingBookmarkId);
            
            var sqlGetTagsUsingBkmarkId = "SELECT tags.rowid,tags.name FROM bookmarks_tags, tags WHERE bookmarks_tags.bookmark_id = ?1 AND bookmarks_tags.tag_id = tags.rowid";
            this.stmGetTagsUsingBkmarkId = this._dbConn.createStatement(sqlGetTagsUsingBkmarkId);
            
            //Get related tags with frequency order by frequency
            var selectTagFrequency = "SELECT t.name, COUNT(bt.tag_id) as frequency FROM tags as t, bookmarks_tags as bt WHERE t.rowid = bt.tag_id";
            var sqlGetRelatedTagsOrderFrequency = selectTagFrequency + " AND t.rowid != ?1 AND bt.bookmark_id IN (SELECT bookmark_id FROM bookmarks_tags WHERE tag_id = ?1 ) GROUP BY t.name ORDER BY frequency DESC, t.name ASC";
            this.stmGetRelatedTagsOrderFrequency = this._dbConn.createStatement(sqlGetRelatedTagsOrderFrequency);

            //Get related tags order by name
            var sqlGetRelatedTagsOrderName = selectTagFrequency + " AND t.rowid != ?1 AND bt.bookmark_id IN (SELECT bookmark_id FROM bookmarks_tags WHERE tag_id = ?1 ) GROUP BY t.name ORDER BY t.name ASC";            
            this.stmGetRelatedTagsOrderName = this._dbConn.createStatement(sqlGetRelatedTagsOrderName);
            
            //Get all tags with frequency
            var sqlGetAllTagsOrderFrequency = selectTagFrequency + " GROUP BY t.name ORDER BY frequency DESC, t.name ASC";
            this.stmGetAllTagsOrderFrequency = this._dbConn.createStatement(sqlGetAllTagsOrderFrequency);
            
            //Get all tags with frequency
            var sqlGetAllTagsOrderName = selectTagFrequency + " GROUP BY t.name ORDER BY t.name ASC";
            this.stmGetAllTagsOrderName = this._dbConn.createStatement(sqlGetAllTagsOrderName);
            
            //Search all tags for match
            var sqlSearchTagsOrderFrequency = selectTagFrequency + " AND t.name LIKE ?1 GROUP BY t.name ORDER BY frequency DESC, t.name ASC";
            this.stmSearchTagsOrderFrequency = this._dbConn.createStatement(sqlSearchTagsOrderFrequency);
            
            //Search all tags for match
            var sqlSearchTagsOrderName = selectTagFrequency + " AND t.name LIKE ?1 GROUP BY t.name ORDER BY t.name ASC";
            this.stmSearchTagsOrderName = this._dbConn.createStatement(sqlSearchTagsOrderName);

            //get total tag count
            var sqlGetTagCount = "SELECT COUNT(rowid) FROM tags";
            this.stmGetTagCount = this._dbConn.createStatement(sqlGetTagCount);
            
            //Remove all rows from tags
            var sqlEmptyTags = "DELETE FROM tags";
            this.stmEmptyTags = this._dbConn.createStatement(sqlEmptyTags);

            //Delete tag using tag id
            var sqlDeleteTagUsingId = "DELETE FROM tags WHERE rowid = ?1";
            this.stmDeleteTagUsingId = this._dbConn.createStatement(sqlDeleteTagUsingId);
            
            //Delete tag using tag name
            var sqlDeleteTagUsingName = "DELETE FROM tags WHERE name = ?1";
            this.stmDeleteTagUsingName = this._dbConn.createStatement(sqlDeleteTagUsingName);
            
            //Delete tag which does not have mapping for any bookmark
            var sqlDeleteUnmappedTag = "DELETE FROM tags WHERE rowid NOT IN (SELECT DISTINCT tag_id FROM bookmarks_tags)";
            this.stmDeleteUnmappedTag = this._dbConn.createStatement(sqlDeleteUnmappedTag);
            
            /**
             * Statements on bookmarks_tags table
             */
            //Insert BookmarkTag
            var sqlInsertBookmarksTags = "INSERT INTO bookmarks_tags VALUES (?1, ?2)";
            this.stmInsertBookmarksTags = this._dbConn.createStatement(sqlInsertBookmarksTags);

            //Get bookmarkTag rowid
            var sqlGetBookmarkTagId = "SELECT rowid FROM bookmarks_tags WHERE bookmark_id = ?1 AND tag_id = ?2";
            this.stmGetBookmarkTagId = this._dbConn.createStatement(sqlGetBookmarkTagId);

            //Get tag ids from bookmarks_tags using bookmark id
            var sqlGetTagIdsUsingBookmarkId = "SELECT tag_id FROM bookmarks_tags WHERE bookmark_id = ?1";
            this.stmGetTagIdsUsingBookmarkId = this._dbConn.createStatement(sqlGetTagIdsUsingBookmarkId);
            
            //Get tag ids from bookmarks_tags using bookmark id
            var sqlGetBookmarkIdsUsingTagId = "SELECT bookmark_id FROM bookmarks_tags WHERE tag_id = ?1";
            this.stmGetBookmarkIdsUsingTagId = this._dbConn.createStatement(sqlGetBookmarkIdsUsingTagId);
            
            //get bookmarks count for a tag id
            var sqlBookmarksCountForTag = "SELECT COUNT(bookmark_id) FROM bookmarks_tags WHERE tag_id = ?1";
            this.stmBookmarksCountForTag = this._dbConn.createStatement(sqlBookmarksCountForTag);

            
            //Remove All Rows From bookmarks_tags
            var sqlEmptyBookmarksTags = "DELETE FROM bookmarks_tags";
            this.stmEmptyBookmarksTags = this._dbConn.createStatement(sqlEmptyBookmarksTags);
            
            //Delete rows using bookmark_id
            var sqlDeleteUsingBookmarkId = "DELETE FROM bookmarks_tags WHERE bookmark_id = ?1";
            this.stmDeleteUsingBookmarkId = this._dbConn.createStatement(sqlDeleteUsingBookmarkId);
                    
            /**
             * Statements on bundles table
             */
            //get bundle id using name
            var sqlGetBundleId = "SELECT rowid FROM bundles WHERE name = ?1";
            this.stmGetBundleId = this._dbConn.createStatement(sqlGetBundleId);
            
            //replace bundle
            var sqlReplaceBundle = "REPLACE INTO bundles VALUES(?1, ?2, ?3, ?4)";
            this.stmReplaceBundle = this._dbConn.createStatement(sqlReplaceBundle);
            
            //Get bundle using name
            var sqlGetBundleUsingName = "SELECT name, order_type, position, tags FROM bundles WHERE name=?1";
            this.stmGetBundleUsingName = this._dbConn.createStatement(sqlGetBundleUsingName);

            //Get all bundles
            var sqlGetBundles = "SELECT name, order_type, position, tags FROM bundles ORDER BY position ASC";
            this.stmGetBundles = this._dbConn.createStatement(sqlGetBundles);
            
            //Update bundles with no tag
            var sqlEmptyTagsForBundles = "UPDATE bundles SET tags=''";
            this.stmEmptyTagsForBundles = this._dbConn.createStatement(sqlEmptyTagsForBundles);
            
            //Delete a bundle
            var sqlDeleteBundle = "DELETE FROM bundles WHERE name=?1";
            this.stmDeleteBundle = this._dbConn.createStatement(sqlDeleteBundle);
            
            //Empty bundles tables
            var sqlEmptyBundles = "DELETE FROM bundles";
            this.stmEmptyBundles = this._dbConn.createStatement(sqlEmptyBundles);
            
            /**
             * Statements on transactions table
             */        
            //Insert into transactions
            var sqlInsertTransaction = "INSERT INTO transactions_new VALUES (?1, ?2, ?3, ?4, ?5)"; 
            this.stmInsertTransaction = this._dbConn.createStatement(sqlInsertTransaction);
            
            //Get all transactions
            var sqlGetAllTransactions = "SELECT action, state, type, data, txn_time FROM transactions_new";
            this.stmGetAllTransactions = this._dbConn.createStatement(sqlGetAllTransactions);
	    var sqlGetAllTransactionsOld = "SELECT action, state, type, data, txn_time FROM transactions";
	    try {
	      this.stmGetAllTransactionsOld = this._dbConn.createStatement(sqlGetAllTransactionsOld);
	    } catch(e){
	      yDebug.print("Old transaction table is not present", YB_LOG_MESSAGE);  
	    }
            //Set transaction state
            var sqlSetTransactionState = "UPDATE transactions_new SET state = ?1, txn_time = ?2 WHERE action = ?3 AND type = ?4 AND data = ?5";
            this.stmSetTransactionState = this._dbConn.createStatement(sqlSetTransactionState);
            
            //Reset send and failed transactions to uninitialized
            var sqlResetTransactions = "UPDATE transactions_new SET state = 0, txn_time = ?1 WHERE state IN (1, 3) AND (txn_time + 60000) < ?2";
            this.stmResetTransactions = this._dbConn.createStatement(sqlResetTransactions);
            
            //Delete from transactions
            var sqlDeleteFromTransactions = "DELETE FROM transactions_new WHERE action=?1 AND type= ?2 AND data = ?3";
            this.stmDeleteFromTransations = this._dbConn.createStatement(sqlDeleteFromTransactions);
            
            //Delete all transactions using state
            var sqlDeleteTransactionsUsingState = "DELETE FROM transactions_new WHERE state = ?1";
            this.stmDeleteTransactionsUsingState = this._dbConn.createStatement(sqlDeleteTransactionsUsingState);
            
            //Remove all rows from transactions
            var sqlEmptyTransactions = "DELETE FROM transactions_new";
            this.stmEmptyTransactions = this._dbConn.createStatement(sqlEmptyTransactions);
            
            //Insert into live bookmarks
            var sqlInsertLiveBookmark = "INSERT INTO live_bookmarks VALUES (?1, ?2, ?3)";
            this.stmInsertLiveBookmark = this._dbConn.createStatement(sqlInsertLiveBookmark);
            
            //Get all live bookmarks for feed
            var sqlGetLiveBookmarks = "SELECT title, url FROM live_bookmarks WHERE feed_url=?1";
            this.stmGetLiveBookmarks = this._dbConn.createStatement(sqlGetLiveBookmarks);
            
            //Delete all children of a livemark
            var sqlDeleteAllLiveBookmarks = "DELETE FROM live_bookmarks WHERE feed_url=?1";
            this.stmDeleteAllLiveBookmarks = this._dbConn.createStatement(sqlDeleteAllLiveBookmarks);
            
            //Empty live bookmarks table
            var sqlEmptyLiveBookmarks = "DELETE FROM live_bookmarks";
            this.stmEmptyLiveBookmarks = this._dbConn.createStatement(sqlEmptyLiveBookmarks);
            
            //get pref
            var sqlGetPref = "SELECT value FROM prefs WHERE name=?1";
            this.stmGetPref = this._dbConn.createStatement(sqlGetPref);
            
            //replace pref
            var sqlReplacePref = "REPLACE INTO prefs VALUES(?1, ?2)";
            this.stmReplacePref = this._dbConn.createStatement(sqlReplacePref);
            
        } catch(e) {
            yDebug.print("YDelLocalStore::setupSQLStatements::Error-"+e, YB_LOG_MESSAGE);
	    ybookmarksUtils.processDBException();
        }
	},
	
	/**
	 * Insert row into bookmarks table and returns rowid
	 */
	insertIntoBookmarks: function(aName, aUrl, aType, aDescription, aHash, aMetaHash, aLastVisited, aLastModified, aDateAdded, aVisitCount, aIcon, aShortcutUrl, aPostData, aShared, aLocalOnly) {
	    try {
   	        this.stmInsertBookmark.bindUTF8StringParameter(0, aName);
	        this.stmInsertBookmark.bindUTF8StringParameter(1, aUrl);
	        this.stmInsertBookmark.bindUTF8StringParameter(2, aType); //Other two types are Livemark, LiveBookmark
	        this.stmInsertBookmark.bindUTF8StringParameter(3, aDescription);
	        this.stmInsertBookmark.bindUTF8StringParameter(4, aHash); //hash
	        this.stmInsertBookmark.bindUTF8StringParameter(5, aMetaHash); //meta_hash
	        this.stmInsertBookmark.bindInt64Parameter(6, aLastVisited); //last_visited
	        this.stmInsertBookmark.bindInt64Parameter(7, aLastModified); //last_modified
	        
	        if(!aDateAdded) {
	            aDateAdded = "" + ((new Date()).getTime() * 1000);
	        }
	        this.stmInsertBookmark.bindInt64Parameter(8, aDateAdded); //added_date
	        
	        this.stmInsertBookmark.bindInt32Parameter(9, aVisitCount); //visit_cout
	        this.stmInsertBookmark.bindUTF8StringParameter(10, aIcon); //icon
	        this.stmInsertBookmark.bindUTF8StringParameter(11, aShortcutUrl);
	        this.stmInsertBookmark.bindUTF8StringParameter(12, aPostData);
	        this.stmInsertBookmark.bindStringParameter(13, aShared);
	        this.stmInsertBookmark.bindStringParameter(14, aLocalOnly);
	        
	        //default expiration time is 1 hour
	        if(aType == "Livemark") 
    	        this.stmInsertBookmark.bindStringParameter(15, new Date(new Date().getTime() + (3600 * 1000))); //expirationTime
    	    else
    	        this.stmInsertBookmark.bindStringParameter(15, 0); //expirationTime
    	        
	        this.stmInsertBookmark.execute();
	        this.stmInsertBookmark.reset();
    	    
	        return this._dbConn.lastInsertRowID;
	    } catch(e) {
	        yDebug.print("YDelLocalStore::insertIntoBookmarks::Error-"+e, YB_LOG_MESSAGE);
	        this.stmInsertBookmark.reset();
	    }
	},
	
	/**
	 * Insert data into transactions table
	 */
	_insertIntoTransactions: function(aAction, aState, aType, aData) {
	    try {
	        var time = parseInt(((new Date()).getTime()) / 1000) + "";
	        this.stmInsertTransaction.bindStringParameter(0, aAction);
	        this.stmInsertTransaction.bindInt32Parameter(1, aState);
	        this.stmInsertTransaction.bindStringParameter(2, aType);
	        this.stmInsertTransaction.bindUTF8StringParameter(3, aData);
	        this.stmInsertTransaction.bindInt64Parameter(4, time);
	        
	        this.stmInsertTransaction.execute();
	        this.stmInsertTransaction.reset();
	        
	        return this._dbConn.lastInsertRowID;
	        
	    } catch(e) {
	        yDebug.print("YDelLocalStore::_insertIntoTransactions::Error-"+e, YB_LOG_MESSAGE);
	        this.stmInsertTransaction.reset();
	    }
	},
	
	/**
	 * mapps columns to bookmark object properties
	 */
	_getBookmarkObjectFromRow: function(statement, allProps) {
	    try {
			var obj = {};
		  
            obj.id = statement.getInt64(0);
            obj.name = statement.getUTF8String(1);
            obj.url = statement.getUTF8String(2);
            obj.type = statement.getUTF8String(3);
            obj.description = statement.getUTF8String(4);
            
            if(allProps) {
                obj.last_visited = statement.getInt64(7);
                obj.last_modified = statement.getInt64(8);
                obj.added_date = statement.getInt64(9);
                obj.visit_count = statement.getInt64(10);
            }

            obj.icon = (statement.getUTF8String(11) != "None") ? statement.getUTF8String(11) : "";
            
            if(allProps) {
                obj.shortcut = statement.getUTF8String(12);
                obj.postData = statement.getUTF8String(13);
            }
            
            obj.shared = statement.getUTF8String(14);
            
            //obj.localOnly = statement.getUTF8String(15);

			return obj;
	    } catch(e) {
	        yDebug.print("YDelLocalStore::_getBookmarkObjectFromRow::Error-"+e, YB_LOG_MESSAGE);
	    }
	},
	
	/**
	 * Get bookmark id from bookmark url
	 */
	_getBookmarkIdFromUrl: function (aUrl) {
	    try {
	        var bookmarkId = null;
            this.stmGetBookmarkId.bindUTF8StringParameter(0, aUrl);
            if(this.stmGetBookmarkId.executeStep()) {
                bookmarkId = this.stmGetBookmarkId.getInt64(0);
            }
            this.stmGetBookmarkId.reset();
            
            return bookmarkId;
	    } catch(e) {
	        yDebug.print("YDelLocalStore::_getBookmarkIdFromUrl::Error-"+e, YB_LOG_MESSAGE);
	        this.stmGetBookmarkId.reset();
	    }
	},
	
	/**
	 * Get bookmark id from bookmark shortcut url
	 */
	_getBookmarkIdFromShortcutUrl: function (aUrl) {
	    try {
	        var bookmarkId = null;
            this.stmGetBookmarkIdFromShortcut.bindUTF8StringParameter(0, aUrl);
            if(this.stmGetBookmarkIdFromShortcut.executeStep()) {
                bookmarkId = this.stmGetBookmarkIdFromShortcut.getInt64(0);
            }
            this.stmGetBookmarkIdFromShortcut.reset();
            
            return bookmarkId;
	    } catch(e) {
	        yDebug.print("YDelLocalStore::_getBookmarkIdFromShortcutUrl::Error-"+e, YB_LOG_MESSAGE);
	        this.stmGetBookmarkIdFromShortcut.reset();
	    }
	},

	/**
	 * Get tag_id from tag_name
	 */
	_getTagIdFromTagName: function( aTag) {
	    try {
            var tagId = null;
            this.stmGetTagId.bindUTF8StringParameter(0, aTag);
            if(this.stmGetTagId.executeStep()) {
                tagId =  this.stmGetTagId.getInt64(0);
            }
            this.stmGetTagId.reset();
            return tagId;
	    } catch(e) {
	        yDebug.print("YDelLocalStore::_getTagIdFromTagName::Error-"+e, YB_LOG_MESSAGE);
	        this.stmGetTagId.reset();
	    }
	},
    
    /**
	 * Get tag_id from favorite tag_name
	 */
	_getTagIdFromFavTagName: function( aTag) {
	    try {	        
            var tagId = null;
            this.stmGetFavTagId.bindUTF8StringParameter(0, aTag);
            if(this.stmGetFavTagId.executeStep()) {
                tagId =  this.stmGetFavTagId.getInt64(0);
            }
            this.stmGetFavTagId.reset();
            return tagId;
	    } catch(e) {
	        yDebug.print("YDelLocalStore::_getTagIdFromTagName::Error-"+e, YB_LOG_MESSAGE);
	        this.stmGetFavTagId.reset();
	    }
	},
	
    /**
     * Get bundle id from bundle name
     */
    _getBundleIdFromBundleName: function (aBundleName) {
        try {
            var aBundleId = null;
            
            this.stmGetBundleId.bindUTF8Stringparameter(0, aBundleName);
            if(this.stmGetBundleId.executeStep()) {
                aBundleId = this.stmGetBundleId.getInt64(0);
            }
            this.stmGetBundleId.reset();

            return aBundleId;
        } catch(e) {
            yDebug.print("YDelLocalStore::_getBundleIdFromBundleName::Error-"+e, YB_LOG_MESSAGE);
            this.stmGetBundleId.reset();
        }
    },
        
   /**
	* Add bookmark to the sqlite database.
	* If bookmark already exists, do nothing.
	*
	* @param aUrl url of the bookmark. url cannot be changed once added
	* @param aName name of the bookmark
	* @param aDescription short description for this bookmark
	* @param aCountTags number of items in the next array parameter
	* @param aTags tags for this bookmark. Array of string
	* @param shared whether or not this bookmark is shared with public
	* @param localOnly whether or not this bookmark should be stored in local only
	*       
	*/
	addBookmark: function(aUrl, aName, aDescription, shortcutUrl, postData, aCountTags, aTags, shared, localOnly) {
      try {
        var bookmarkId = this._getBookmarkIdFromUrl(aUrl);
        
        //edit bookmark if bookmark is present
        if(bookmarkId) {
            this.editBookmark(aUrl, {
                                                        name: aName,
                                                        url: aUrl,
                                                        description: aDescription,
                                                        shortcut: shortcutUrl,
                                                        postData: postData,
                                                        tags: aTags,
                                                        shared: shared,
                                                        localOnly: localOnly
                                                    });
        } else {
            bookmarkId = this.insertIntoBookmarks (aName, aUrl, 
                                            "Bookmark", aDescription,
                                            "", "", 
                                            0, 0, 0, 0, 
                                            "", shortcutUrl, postData, 
                                            shared, localOnly);
            if(aCountTags > 0) {
                for(var i=0; i < aCountTags; i++) {
                    if(!aTags[i]) continue;
                    var tagId = this._addTag(aTags[i]);
                    this.stmInsertBookmarksTags.bindInt64Parameter(0, bookmarkId);
                    this.stmInsertBookmarksTags.bindInt64Parameter(1, tagId);
                    
                    this.stmInsertBookmarksTags.execute();
                    this.stmInsertBookmarksTags.reset();
                }
            }
        }
        
        return bookmarkId;
      } catch(e) {
	ybookmarksUtils.processDBException(e);
        yDebug.print("YDelLocalStore::addbookmark:Error-"+e, YB_LOG_MESSAGE);
        this.stmInsertBookmarksTags.reset();
      }
	},
	
   /**
	* Add bookmark to rdf datasource. This method is same as the previous addBookmark method except
	* for the input parameter.
	*
	* @param aBookmarkObject bookmark object returned by getBookmark or newly created nsIYBookmark object
	* 
	*/
	addBookmarkObject: function(aBookmarkObject) {
      try {
        var bookmarkId = this._getBookmarkIdFromUrl(aBookmarkObject.url);
        
        //edit bookmark if bookmark is present
        if(bookmarkId) {
            this.editBookmark(aBookmarkObject.url, aBookmarkObject);            
            this.setStringPropertyForBookmark(aBookmarkObject.url, "hash", aBookmarkObject.hash);
            this.setStringPropertyForBookmark(aBookmarkObject.url, "meta_hash", aBookmarkObject.meta_hash);
        } else {
            bookmarkId = this.insertIntoBookmarks (aBookmarkObject.name, aBookmarkObject.url, 
                                      "Bookmark", aBookmarkObject.description, 
                                      aBookmarkObject.hash, aBookmarkObject.meta_hash, 
                                      ((aBookmarkObject.last_visited) ? aBookmarkObject.last_visited : 0), aBookmarkObject.last_modified, aBookmarkObject.added_date,
                                      ((aBookmarkObject.visit_count) ? aBookmarkObject.visit_count : 0), 
                                      ((aBookmarkObject.icon) ? aBookmarkObject.icon : ""), aBookmarkObject.shortcut, aBookmarkObject.postData, 
                                      aBookmarkObject.shared, aBookmarkObject.localOnly);
            
            var tags = ybookmarksUtils.nsArrayToJs(aBookmarkObject.tags);

            if(tags.length > 0) {
                for(var i=0; i < tags.length; i++) {
                    if(!tags[i]) continue;
                    var tagId = this._addTag(tags[i]);
                    this.stmInsertBookmarksTags.bindInt64Parameter(0, bookmarkId);
                    this.stmInsertBookmarksTags.bindInt64Parameter(1, tagId);
                    
                    this.stmInsertBookmarksTags.execute();
                    this.stmInsertBookmarksTags.reset();
                }
            }
        }	
      } catch(e) {
        yDebug.print("YDelLocalStore::addBookmarkObject::Error-"+e, YB_LOG_MESSAGE);
        this.stmInsertBookmarksTags.reset();
      }
	},
  
  /**
   * Adds a tag to database, does nothing if tag already exist
   */
  _addTag: function(aTag) {
    try {
        //We will check if tag already exist - if yes add only mapping if no add tag and then mapping
        var rowId = null;
        
        //check if tag already exists
        rowId = this._getTagIdFromTagName(aTag);
        
        //add new tag to db
        if(!rowId) {
            this.stmInsertTags.bindUTF8StringParameter(0, aTag);
            this.stmInsertTags.execute();
            this.stmInsertTags.reset();
            rowId = this._dbConn.lastInsertRowID;
        }
        
        return rowId;
    } catch(e) {
        yDebug.print("YDelLocalStore::_addTag:Error-"+e, YB_LOG_MESSAGE);
        this.stmInsertTags.reset();
    }
  },
  
  /**
   * Removes all tags for given bookmark id
   */
  _removeAllTagsForBookmarkId: function (bookmarkId) {
    try {
        if(!bookmarkId) return;
        
        //Delete mapping of the bookmarks with tags
        this.stmDeleteUsingBookmarkId.bindInt64Parameter(0, bookmarkId);
        this.stmDeleteUsingBookmarkId.execute();
        this.stmDeleteUsingBookmarkId.reset();
        
        //Delete all the tags which may have remain unmapped after removing mapping above
        this.stmDeleteUnmappedTag.execute();
        this.stmDeleteUnmappedTag.reset();
                
                
    } catch(e) {
        yDebug.print("YDelLocalStore::_removeAllTagsForBookmarkId:Error-"+e, YB_LOG_MESSAGE);
        this.stmDeleteUsingBookmarkId.reset();
        this.stmDeleteUnmappedTag.reset();
    }
  },
  
  _updateAllLivemarks : function() {
    try {
        var feedList = [];
        var sqlStmt = this._dbConn.createStatement("SELECT distinct feed_url from live_bookmarks");        
        while(sqlStmt.executeStep()) {
            var feed = sqlStmt.getUTF8String(0);
            if(feed) {
                feedList.push(feed);
                yDebug.print("YDelLocalStore::_updateAllLivemarks: Livemark :->" + feed);
            }
        }   
        sqlStmt.reset();     
        //Reload each feed
        if(feedList.length) {
            yDebug.print("YDelLocalStore::_updateAllLivemarks Livemarks being updated...", YB_LOG_MESSAGE);
            for(var i=0; i < feedList.length; ++i) {
                this.reloadLivemark(feedList[i]);
            }        
        } else {
            yDebug.print("YDelLocalStore::_updateAllLivemarks No Livemarks present.", YB_LOG_MESSAGE);
        }
    } catch(e) {
        yDebug.print("YDelLocalStore::_updateAllLivemarks:Error-"+e, YB_LOG_MESSAGE);
    }
  },
  
  notify: function(aTimer) {
    try {
    	//yDebug.print("YDelLocalStore::notify", YB_LOG_MESSAGE);
    	
    	if(this._timer && this._timer == aTimer) {
	        var del = Components.classes["@yahoo.com/socialstore/delicious;1"]
		                     .getService( Components.interfaces.nsISocialStore );      
		    var username = del.getUserName();
	        if(username) {
	            this._updateAllLivemarks();
	        }
    	}
    	
    	if(this._faviconTimer && this._faviconTimer == aTimer) {
    	  yDebug.print("YDelLocalStore::notify: favicon Timer");
	  
	  // the IO service
	  var IOSVC = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	  
	  var bkms = this.getBookmarksToUpdateFavicon(5, {});
	  
	  for(var i=0; i<bkms.length; i++) {
	    try {
		  var uri = IOSVC.newURI(bkms[i].url, null, null);
		  var iconURL = uri.prePath + "/favicon.ico";
		  //yDebug.print("YDelLocalStore::notify:iconUrl-"+iconURL, YB_LOG_MESSAGE);
		  
			//mark all non http urls for not fetching favicons and skip
			if(!uri.schemeIs('http')) {
				//yDebug.print("Found non http url... skipping", YB_LOG_MESSAGE);
				this.setStringPropertyForBookmark(bkms[i].url, "icon", "None");
				continue;
			}

		  if(iconURL) {
		    var chan = IOSVC.newChannel(iconURL, null, null);
		    var listener = new bookmarksFavIconLoadListener(uri.spec, iconURL, chan);
		    chan.notificationCallbacks = listener;
		    chan.asyncOpen(listener, null);
		  }
	    } catch(e) {
	      //on exception mark the url invalid for favicons
	      yDebug.print("YDelLocalStore::notify:Error-"+e, YB_LOG_MESSAGE);
	      this.setStringPropertyForBookmark(bkms[i].url, "icon", "None");
	    }
	  }
    	}
    } catch(e) {
        yDebug.print("YDelLocalStore::notify:Error-"+e, YB_LOG_MESSAGE);
    }
  },
  
  /**
   * updates livemark with children
   */
  _updateLivemarkChildren: function(livemarkId) {
    try {
      var feedUrl = this.getFeedUrlOfLivemark(livemarkId);
      
      if (feedUrl) {
        var expirationDate = this.getExpirationTimeOfLivemark(livemarkId);

        if (expirationDate) {
          if (expirationDate.Value > new Date()) {
            yDebug.print("Livemark " + feedUrl + " is up-to-date");
            return;
          }
        }

        if (! expirationDate) { // Loading for first time...
          this.deleteAllLiveBookmarks(feedUrl);
          this.addLiveBookmark(feedUrl, "Loading...", "about:livemark-loading");
        }

        var channel = IOSVC.newChannel(feedUrl, null, null);
        var listener = new FeedListener(this, channel, feedUrl);
        channel.notificationCallbacks = listener;
        channel.asyncOpen(listener, null);
      }
    } catch(e) {
        yDebug.print("YDelLocalStore::_updateLivemarkChildren:Error-"+e, YB_LOG_MESSAGE);
    }
  },
  
  /**
   * Add the tags to the given url. Does nothing if no url present in the bookmarks sqlite database.
   * Duplicate tags are ignored.
   *
   * @param tagCount number of items in the next parameter, array of tags.
   * @param aTags array of tags. 
   * @param aUrl url to which aTags are applied.
   *
   * @return false if tags are applied successfully.
   *
   * NOTE: This method may throw an exception.
   *
   */
  addTag: function(aTagCount, aTags, aUrl) {
    try {
        if(!aUrl) return;

        var bookmarkId = this._getBookmarkIdFromUrl(aUrl);
        
        if(!bookmarkId) return;

        if(aTagCount > 0) {
            
            for(var i=0; i < aTagCount; i++) {
                if(!aTags[i]) continue;
                
                var tagId = this._addTag(aTags[i]);
                var mappingFound = false;
                
                this.stmGetBookmarkTagId.bindInt64Parameter(0, bookmarkId);
                this.stmGetBookmarkTagId.bindInt64Parameter(1, tagId);
                if(this.stmGetBookmarkTagId.executeStep()) {
                    mappingFound = true;
                }
                this.stmGetBookmarkTagId.reset();
                
                if(mappingFound) continue;
                
                this.stmInsertBookmarksTags.bindInt64Parameter(0, bookmarkId);
                this.stmInsertBookmarksTags.bindInt64Parameter(1, tagId);
                
                this.stmInsertBookmarksTags.execute();
                this.stmInsertBookmarksTags.reset();
            }
        }
    } catch(e) {
        yDebug.print("YDelLocalStore::addTags::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetBookmarkTagId.reset();
        this.stmInsertBookmarksTags.reset();
    }        
  },

  /**
   * Add new livemarks to bookmarks database
   * @param aUrl the url of where the livemark comes from
   * @parma aName the name of the livemark
   * @param aDescription the description of the livemark
   * @param aCountTags size of tags array
   * @param aTags array of tags
   * @param shared whether or not this bookmark is shared with public
   * @param localOnly whether or not this bookmark should be stored in local only   
   */
  addLivemark: function(aUrl, aName, aDescription, aCountTags, aTags, shared, localOnly) {
    try {
        var livemarkId = this._getBookmarkIdFromUrl(aUrl);
        
        if(livemarkId) {
            this.editBookmark(aUrl, {
                                    name: aName,
                                    url: aUrl,
                                    description: aDescription,
                                    tags: aTags,
                                    shared: shared,
                                    localOnly: localOnly
                                });

        } else {
	        livemarkId = this.insertIntoBookmarks (aName, aUrl, 
                                      "Livemark", aDescription, 
                                      "", "", 
                                      0, 0, 0, 0, 
                                      "", "", "", 
                                      shared, localOnly);;

            if(aCountTags > 0) {
                for(var i=0; i < aCountTags; i++) {
                    if(!aTags[i]) continue;
                    
                    var tagId = this._addTag(aTags[i]);
                    this.stmInsertBookmarksTags.bindInt64Parameter(0, livemarkId);
                    this.stmInsertBookmarksTags.bindInt64Parameter(1, tagId);
                    
                    this.stmInsertBookmarksTags.execute();
                    this.stmInsertBookmarksTags.reset();
                }
            }
        }
        
        this._updateLivemarkChildren(livemarkId);
    } catch(e) {
        yDebug.print("YDelLocalStore::addLivemark::Error-"+e, YB_LOG_MESSAGE);
         this.stmInsertBookmarksTags.reset();
    }
  },
  
  /**
   * Get feed url of livemark
   */
  getFeedUrlOfLivemark: function (livemarkId) {
    try {
        var feedUrl = null;
        this.stmGetFeedUrl.bindInt64Parameter(0, livemarkId);
        if(this.stmGetFeedUrl.executeStep()) {
            feedUrl = this.stmGetFeedUrl.getUTF8String(0);
        }
        this.stmGetFeedUrl.reset();
        
        return feedUrl;
    } catch(e) {
        yDebug.print("YDelLocalStore::getExpirationTimeOfLivemark::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetFeedUrl.reset();
    }
  },
  
  /**
   * Get expiration time for livemark
   */
  getExpirationTimeOfLivemark: function (livemarkId) {
    try {
        var expirationTime = 0;
        this.stmExpirationTime.bindInt64Parameter(0, livemarkId);
        if(this.stmExpirationTime.executeStep()) {
            expirationTime = this.stmExpirationTime.getInt64(0);
        }
        this.stmExpirationTime.reset();
        
        return expirationTime;
    } catch(e) {
        yDebug.print("YDelLocalStore::getExpirationTimeOfLivemark::Error-"+e, YB_LOG_MESSAGE);
        this.stmExpirationTime.reset();
    }
  },
  
  /**
   * Add live bookmark for feed url
   */
  addLiveBookmark: function (feedUrl, title, url) {
    try {
        this.stmInsertLiveBookmark.bindUTF8StringParameter(0, feedUrl);
        this.stmInsertLiveBookmark.bindUTF8StringParameter(1, title);
        this.stmInsertLiveBookmark.bindUTF8StringParameter(2, url);
        this.stmInsertLiveBookmark.execute();
        this.stmInsertLiveBookmark.reset();
    } catch(e) {
        yDebug.print("YDelLocalStore::addLivemark::Error-"+e, YB_LOG_MESSAGE);
        this.stmInsertLiveBookmark.reset();
    }
  },
  
  /**
   * Delete all live bookmarks for feedurl
   */
  deleteAllLiveBookmarks: function (uri) {
    try {
        this.stmDeleteAllLiveBookmarks.bindUTF8StringParameter(0, uri);
        this.stmDeleteAllLiveBookmarks.execute();
        this.stmDeleteAllLiveBookmarks.reset();
    } catch(e) {
        yDebug.print("YDelLocalStore::deleteAllLiveBookmarks::Error-"+e, YB_LOG_MESSAGE);
        this.stmDeleteAllLiveBookmarks.reset();
    }
  },
    
  /**
   * Delete all bookmarks 
   *
   */
  deleteAllBookmarks: function() {
     try {
        if (this._allowDeleteAllBookmarks) {
            this._dbConn.beginTransaction();
            
            //Remove All Rows From bookmarks_tags
            this.stmEmptyBookmarksTags.execute();
            this.stmEmptyBookmarksTags.reset();
            
            //Update bundles with no tag
            this.stmEmptyTagsForBundles.execute();
            this.stmEmptyTagsForBundles.reset();
            
            //Remove all rows from tags
            this.stmEmptyTags.execute();
            this.stmEmptyTags.reset();
            
            //Remove all rows from bookmarks
            this.stmEmptyBookmarks.execute();
            this.stmEmptyBookmarks.reset();
            
            //Remove all rows from transactions
            this.stmEmptyTransactions.execute();
            this.stmEmptyTransactions.reset();
            
            //Remove all rows from live_bookmarks
            this.stmEmptyLiveBookmarks.execute();
            this.stmEmptyLiveBookmarks.reset();
            	    
            this._dbConn.commitTransaction();
            
            var os = CC["@mozilla.org/observer-service;1"].
            getService(CI.nsIObserverService);
            var notifyData = "remove-extra";  // FIXME: Is the name okay?
            os.notifyObservers(null, "ybookmark.syncBegin", notifyData);
            yDebug.print("YDelLocalStore::deleteAllBookmarks::Finished", YB_LOG_MESSAGE);
        }
     } catch(e) {
        this._dbConn.rollbackTransaction();
        yDebug.print("YDelLocalStore::deleteAllBookmarks::Error-"+e, YB_LOG_MESSAGE);
        this.stmEmptyBookmarksTags.reset();
        this.stmEmptyTagsForBundles.reset();
        this.stmEmptyTags.reset();
        this.stmEmptyBookmarks.reset();
        this.stmEmptyTransactions.reset();
        this.stmEmptyLiveBookmarks.reset();
     }
  },

  /**
   * Edit the given bookmark. New values are provided as a nsIYBookmark object.
   * URL should not be allowed to be edited. Implementation is free to decide on 
   * the editable attributes.
   *
   * @param aUrl url to be edited.
   * @param args object of nsIYBookmark. This is key value pair represented as a JSON object.
   * 
   * @return false if aUrl is not present in the database, true otherwise.
   *
   * NOTE: Method may throw an exception.
   *
   */
  editBookmark: function(aUrl, args) {
    try {
        //Check if url is already bookmarked
        var bookmarkId = this._getBookmarkIdFromUrl(aUrl);

        if(!bookmarkId) return false;
        var isChanged = false;
        var isFeed = false;
         
        //Check if url is modified and new url already exist, if yes delete it
        if(args["url"] && args["url"] != aUrl) {
            var tempBookmarkId = this._getBookmarkIdFromUrl(args["url"]);
            if(tempBookmarkId) {
                this.deleteBookmark(args["url"]);
            }
			isChanged = true;
			//aUrl = args["url"];
        }
        
        //update bookmark with given data
        if (args["tags"]) {
            var paramTags = new Array();
            try {
              var tags = args["tags"];
              tags = tags.QueryInterface(CI.nsIArray).enumerate();
              while (tags.hasMoreElements()) {
                paramTags.push(tags.getNext().
                  QueryInterface(CI.nsISupportsString).data);
              }
            } catch (e) {
              paramTags = args["tags"];
            }
			
            isFeed = (ybookmarksUtils.containsTag(paramTags.join(' '),
              "firefox:rss") >= 0) ? true : false;
            
            this._removeAllTagsForBookmarkId(bookmarkId);
            this.addTag(paramTags.length, paramTags, aUrl);
            isChanged = true;
        }
        
        //check for deleted shortcut
        if(!args["shortcut"]) args["shortcut"] = "";
        
		//update bookmark with new data
		this.stmUpdateBookmark.bindUTF8StringParameter(0, args['name']);
		this.stmUpdateBookmark.bindUTF8StringParameter(1, args['url']);
		this.stmUpdateBookmark.bindUTF8StringParameter(2, args['description']);
		this.stmUpdateBookmark.bindUTF8StringParameter(3, args['shortcut']);
		this.stmUpdateBookmark.bindUTF8StringParameter(4, args['shared']);
		this.stmUpdateBookmark.bindUTF8StringParameter(5, args['postData']);
		this.stmUpdateBookmark.bindUTF8StringParameter(6, args['localOnly']);
		this.stmUpdateBookmark.bindUTF8StringParameter(7, aUrl);
		this.stmUpdateBookmark.execute();
		this.stmUpdateBookmark.reset();
		
        if (isChanged) {
            var modDate = (new Date()).getTime() * 1000;
            this.setNumericPropertyForBookmark(aUrl, "last_modified", modDate);
        }
        
        if (isFeed) {
            //check if livemark not there
            //if not update bookmarktype to livebookmark
            this.setNumericPropertyForBookmark(aUrl, "type", "Livemark");
        }

        //update livemark children
        this._updateLivemarkChildren(bookmarkId);
        return true;
    } catch(e) {
        yDebug.print("YDelLocalStore::editBookmark::Error-"+e, YB_LOG_MESSAGE);
        this.stmUpdateBookmark.reset();
    }
  },

  /**
   * Delete the bookmark and all its associated tags from the database. If same tag is used by 
   * multiple bookmarks, only the association between bookmark and the tag is removed. Tag is 
   * retained in the system.
   *
   * @param aUrl url to be removed from the system.
   *
   * @return false if aUrl is not present in the system, true otherwise.
   *
   */
  deleteBookmark: function( aUrl ) {
    try {
        var bookmarkId = this._getBookmarkIdFromUrl(aUrl);
        
        if(!bookmarkId) return false;
        
        //remvoe all tags
        this._removeAllTagsForBookmarkId(bookmarkId);
        
        //remove bookmark
        this.stmDeleteBookmarkUsingId.bindInt64Parameter(0, bookmarkId);
        this.stmDeleteBookmarkUsingId.execute();
        this.stmDeleteBookmarkUsingId.reset();
        
        //remove bookmark from feed container if present
        var feedUrl = this.getFeedUrlOfLivemark(bookmarkId);
        if (feedUrl) this.deleteAllLiveBookmarks(feedUrl);
        
        //delete corresponding entry from url_visits as well
        var sql = "DELETE FROM url_visits WHERE url=?1";
        var stm = this._dbConn.createStatement(sql);
        stm.bindUTF8StringParameter(0, aUrl);
        stm.execute();
        stm.reset();
        stm = null;
        
        var os = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService);
        var notifyData = aUrl;
        os.notifyObservers(null, "ybookmark.bookmarkDeleted", notifyData);

        return true;
    } catch(e) {
        yDebug.print("YDelLocalStore::deleteBookmark::Error-"+e, YB_LOG_MESSAGE);
        this.stmDeleteBookmarkUsingId.reset();
    }
  },

  /**
   * Updates existing bookmark numeric properties
   */
  setNumericPropertyForBookmark: function(url, propName, propValue) {
    try {
        if(!url || !propName) return;

		//passing of only numeric column names is allowed
		switch(propName) {
		case "last_visited":
		case "last_modified":
		case "added_date":
		case "visit_count":
		case "expiration_time":
	        var sqlUpdate = "UPDATE bookmarks SET "+propName+"=?1 WHERE url = ?2";
	        var stmUpdate = this._dbConn.createStatement(sqlUpdate);
	        stmUpdate.bindInt64Parameter(0, propValue * 1);
	        stmUpdate.bindUTF8StringParameter(1, url);

	        stmUpdate.execute();
	        stmUpdate.reset();
			break;
		} 
    } catch(e) {
        yDebug.print("YDelLocalStore::setNumericPropertyForBookmark::Error-"+e, YB_LOG_MESSAGE); 
    }        
  },
  
  /**
   * Updates existing bookmark string properties
   */
  setStringPropertyForBookmark: function(url, propName, propValue) {
    try {
        if(!url || !propName) return;
        
		//passing of only string column names is allowed
		switch(propName) {
		case "name":
		case "url":
		case "type":
		case "description":
		case "hash":
		case "meta_hash":
		case "icon":
		case "shortcut":
		case "post_data":
		case "shared":
		case "local_only":
	        var sqlUpdate = "UPDATE bookmarks SET "+propName+"="+"?1 WHERE url = ?2";
	        var stmUpdate = this._dbConn.createStatement(sqlUpdate);
	        
	        stmUpdate.bindUTF8StringParameter(0, propValue);
	        stmUpdate.bindUTF8StringParameter(1, url);
	        
	        stmUpdate.execute();
	        stmUpdate.reset();
			break;
		}
    } catch(e) {
        yDebug.print("YDelLocalStore::setStringPropertyForBookmark::Error-"+e, YB_LOG_MESSAGE); 
    }
  },

  /**
   * Get the bookmarks for a given tag. If aTag is null, return all the bookmarks.
   * 
   * @param aTag1 tag for which bookmark is requested.
   * @param aTag2 related tag for which bookmark is requested.
   * @param aSortOrder sorting order for bookmarks {"alpha", "last_added", "site", "most_visited", "last_visited"}
   * @param aCount parameter which will be set to the number of items in the returned array.
   * @return an array of nsIYBookmark object. Each object is a key value pair. An empty array if
   *         no urls tagged with the given tag or aTag is not present in the database.
   *
   */
  getBookmarks: function(aTag1, aTag2, aSortOrder, aLimit, aCount) {
    var result = new Array();
    var tmpStm = null;

    try {
      switch(aSortOrder) {
        case "LastAdded":
        case "LastAddedReverse":
        case "MostVisited":
        case "LastVisited":
        case "Site":
        case "NameReverse":
        case "Name": break;
        default:
            aSortOrder = "LastAdded";
      }

      if(!aLimit) aLimit = -1; //negative value indicates no upper bound
            
      if (aTag1) {
        //get all the bookmarks under tag
        var tagId = this._getTagIdFromTagName(aTag1);
        var tagId2 = this._getTagIdFromTagName(aTag2);
        
        if(!tagId) return result;
        
        if(tagId2) {
            tmpStm = this["stmGetBookmarksOf2TagsBy"+aSortOrder];
            tmpStm.bindInt64Parameter(0, tagId2);
            tmpStm.bindInt64Parameter(1, tagId);
            tmpStm.bindInt32Parameter(2, aLimit);
        } else {
            tmpStm = this["stmGetBookmarksUsingTagBy"+aSortOrder];
            tmpStm.bindInt64Parameter(0, tagId);
            tmpStm.bindInt32Parameter(1, aLimit);
        }
      } else {
        //get all the bookmarks
        tmpStm = this["stmGetAllBookmarksBy"+aSortOrder];
      }

    while(tmpStm.executeStep()) {
        var bookmarkObject = this._getBookmarkObjectFromRow(tmpStm, false);
        result.push(bookmarkObject);
    }
    tmpStm.reset();
    
    tmpStm = null;
    
    if (aCount) {
    aCount.value = result.length;
    }
    } catch (e) {
      yDebug.print("YDelLocalStore::getBookmarks::Error-"+e, YB_LOG_MESSAGE); 
      tmpStm.reset();
    }

    return result;
  },
  
  getBookmarksIntersectionForTags: function(tagCount, aTags, aSortOrder, aCount) {
    if(tagCount == 0) {
        return [];
    }
        
    var sortOption;
    switch(aSortOrder) {
        case "MostVisited": sortOption = "ORDER BY type, visit_count DESC, b.name"; break;
        case "LastVisited": sortOption = "ORDER BY type, last_visited DESC, b.name"; break;
        case "Site": sortOption = "ORDER BY type, b.url, b.name"; break;
        case "LastAddedReverse": sortOption = "ORDER BY type, added_date, b.name"; break;
        case "LastAdded": sortOption = "ORDER BY type, added_date DESC, b.name"; break;
        case "Name": sortOption = "ORDER BY type, b.name"; break;
        case "NameReverse": sortOption = "ORDER BY type, b.name DESC"; break;
        default:
            sortOption = "ORDER BY type, added_date DESC, b.name";
            break;
    }    
    
    var result = new Array();
    try {
        var tagArg = "\"" + aTags[0].replace(/'/,"''") + "\"";
        for(var i=1; i<tagCount; ++i) {
            tagArg += ",\"" + aTags[i].replace(/\'/,"''") + "\"";
        }
        var my_q = 'select b.rowid, b.*, count(bt.tag_id) as ct from bookmarks as b, bookmarks_tags as bt, tags where b.rowid = bt.bookmark_id and bt.tag_id = tags.rowid and tags.name IN (' + tagArg + ') ' + 'group by bt.bookmark_id having ct=' + aTags.length + ' ' + sortOption;
        //yDebug.print(my_q, YB_LOG_MESSAGE);
        var tmpStm = this._dbConn.createStatement(my_q);
        while(tmpStm.executeStep()) {
            var bookmarkObject = this._getBookmarkObjectFromRow(tmpStm, false);
            result.push(bookmarkObject);
        }
        tmpStm.reset();
        tmpStm = null;
        if (aCount) {
            aCount.value = result.length;
        }
    } catch(e) {
        yDebug.print("YDelLocalStore::getBookmarksIntersectionForTags::Error:" + e, YB_LOG_MESSAGE);
    }
    return result;
  },
  
  getBookmarksUnionforTags: function(tagCount, aTags, aSortOrder, aCount) {
    if(tagCount == 0) {
        return [];
    }
        
    var sortOption;
    switch(aSortOrder) {
        case "LastAddedReverse": sortOption = "ORDER BY type, added_date, b.name"; break;
        case "LastAdded": sortOption = "ORDER BY type, added_date DESC, b.name"; break;
        case "Name": sortOption = "ORDER BY type, b.name"; break;
        case "NameReverse": sortOption = "ORDER BY type, b.name DESC"; break;
		case "MostVisited": sortOption = "ORDER BY type, visit_count DESC, b.name"; break;
        default:
            sortOption = "ORDER BY type, added_date DESC, b.name";
            break;
    }    
    
    var result = new Array();
    try {
        var tagArg = "\"" + aTags[0].replace(/'/,"''") + "\"";
        for(var i=1; i<tagCount; ++i) {
            tagArg += ",\"" + aTags[i].replace(/\'/,"''") + "\"";
        }
        var my_q = 'select distinct b.rowid, b.* from bookmarks as b, bookmarks_tags as bt, tags where b.rowid = bt.bookmark_id and bt.tag_id = tags.rowid and tags.name IN (' + tagArg + ') ' + sortOption;
        //yDebug.print("YDelLocalStore::getBookmarksUnionforTags::Query:" + my_q, YB_LOG_MESSAGE);
        var tmpStm = this._dbConn.createStatement(my_q);
        while(tmpStm.executeStep()) {
            var bookmarkObject = this._getBookmarkObjectFromRow(tmpStm, false);
            result.push(bookmarkObject);
        }
        tmpStm.reset();
        tmpStm = null;
        if (aCount) {
            aCount.value = result.length;
        }
    } catch(e) {
        yDebug.print("YDelLocalStore::getBookmarksUnionforTags::Error:" + e, YB_LOG_MESSAGE);
    }
    return result;
  },

  /**
   * Get the recently added bookmarks
   * 
   * @param maxCount max number of bookmarks needed
   * @param aCount parameter which will be set to the number of items in the returned array.
   *
   * @return an array of nsIYBookmark object. Each object is a key value pair. An empty array if
   *         no urls tagged with the given tag or aTag is not present in the database.
   *
   */
  getRecentBookmarks: function(maxCount, aCount) {
    var result = new Array();
    var tmpStm = null;
    
    try {
        if(!maxCount) maxCount = 1000000; //return all the bookmarks
        
        tmpStm = this._dbConn.createStatement("SELECT rowid, * FROM bookmarks ORDER BY type, added_date DESC, name LIMIT "+maxCount);
        
        while(tmpStm.executeStep()) {
            var bookmarkObject = this._getBookmarkObjectFromRow(tmpStm, false);
            result.push(bookmarkObject);
        }
        tmpStm.reset();
        
        tmpStm = null;
        
        if (aCount) {
        aCount.value = result.length;
        }
    } catch (e) {
      yDebug.print("YDelLocalStore::getRecentBookmarks::Error-"+e, YB_LOG_MESSAGE); 
    }

    return result;
  },

  /**
   * Get the most visited bookmarks
   * 
   * @param maxCount max number of bookmarks needed
   * @param aCount parameter which will be set to the number of items in the returned array.
   *
   * @return an array of nsIYBookmark object. Each object is a key value pair. An empty array if
   *         no urls tagged with the given tag or aTag is not present in the database.
   *
   */
  getMostVisitedBookmarks: function(maxCount, aCount) {
    var result = new Array();
    var tmpStm = null;
    
    try {
        if(!maxCount) maxCount = 1000000; //return all the bookmarks
        
        tmpStm = this._dbConn.createStatement("SELECT rowid, * FROM bookmarks ORDER BY type, visit_count DESC, name LIMIT "+maxCount);
        
        while(tmpStm.executeStep()) {
            var bookmarkObject = this._getBookmarkObjectFromRow(tmpStm, false);
            result.push(bookmarkObject);
        }
        tmpStm.reset();
        
        tmpStm = null;
        
        if (aCount) {
        aCount.value = result.length;
        }
    } catch (e) {
      yDebug.print("YDelLocalStore::getMostVisitedBookmarks::Error-"+e, YB_LOG_MESSAGE); 
    }

    return result;
  },

  /**
   * get Bookmarks Without Favicon
   * @param {} maxCount
   * @param {} aCount
   * @return {}
   */
  getBookmarksToUpdateFavicon: function(maxCount, aCount) {
    var result = new Array();
    var tmpStm = null;
    
    try {
        if(!maxCount) maxCount = 1000000; //return all the bookmarks
        
        tmpStm = this._dbConn.createStatement("SELECT rowid, * FROM bookmarks WHERE icon = '' AND type='Bookmark' ORDER BY type, added_date DESC, name LIMIT "+maxCount);
        
        while(tmpStm.executeStep()) {
            var bookmarkObject = this._getBookmarkObjectFromRow(tmpStm, false);
            result.push(bookmarkObject);
        }
        tmpStm.reset();
        
        tmpStm = null;
        
        if (aCount) {
        aCount.value = result.length;
        }
    } catch (e) {
      yDebug.print("YDelLocalStore::getBookmarksWithoutFavicon::Error-"+e, YB_LOG_MESSAGE); 
    }

    return result;
  },  
  
  /**
   * Get the tags for a given url. If url parameter is null, return all the tags in the system.
   *
   * @param aUrl url for which tags are requested.
   * @param aCount parameter which will be set to the number of items in the returned array.
   *
   * @return an array of string having the tags for the given aUrl. An empty array if aUrl is
   *         not present in the system or aUrl do not have any tags.
   *
   */
  getTags: function(aUrl, aCount) {
    var tags = [];
    
    try {
        var bookmarkId = this._getBookmarkIdFromUrl(aUrl);
        var tagIDArray = new Array();   
        if(bookmarkId) {		
            this.stmGetTagsUsingBookmarkId.bindInt64Parameter(0, bookmarkId);
            while(this.stmGetTagsUsingBookmarkId.executeStep()) {                
                tagIDArray.push(this.stmGetTagsUsingBookmarkId.getInt64(0));
            }
            this.stmGetTagsUsingBookmarkId.reset();
            
            var rTagArray = [];
            this.stmGetTagsUsingBkmarkId.bindInt64Parameter(0, bookmarkId);
            while(this.stmGetTagsUsingBkmarkId.executeStep()) {
                var index = this.stmGetTagsUsingBkmarkId.getInt64(0);
                var tag = this.stmGetTagsUsingBkmarkId.getUTF8String(1);
                rTagArray[index] = tag;
            }
            this.stmGetTagsUsingBkmarkId.reset();
            
            for(var i=0; i < tagIDArray.length; ++i) {
                var index = tagIDArray[i];
                tags.push(rTagArray[index]);
            }
        }
		
		if(aCount) {
			aCount.value = tags.length;
		}
    } catch(e) {
        yDebug.print("YDelLocalStore::getTags::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetTagsUsingBookmarkId.reset();
        this.stmGetTagsUsingBkmarkId.reset();
    }

    return tags;
  },
  
  /**
   * Get all the tags from store, get related tags if tag is passed
   * 
   * @param aTag tag for which related tags required
   * @param aSortOrder sorting order for tags "alpha" n "frequency"
   *
   * @return an array of tags and frequency
   *
   */
  getAllTags: function(aTag, aSortOrder) {
    var tags = new NSArray();
    try {
        var tagId = this._getTagIdFromTagName(aTag);
        
        var tmpStm = null;
        
        if(tagId) { //get related tags
            tmpStm = (aSortOrder == "frequency") ? this.stmGetRelatedTagsOrderFrequency : this.stmGetRelatedTagsOrderName;
            tmpStm.bindInt64Parameter(0, tagId);
        } else { //get all tags
            tmpStm = (aSortOrder == "frequency") ? this.stmGetAllTagsOrderFrequency : this.stmGetAllTagsOrderName;
        }
        
        while(tmpStm.executeStep()) {
            var propertyBag = new HashPropertyBag();
            propertyBag.setProperty("name", tmpStm.getUTF8String(0));
            propertyBag.setProperty("frequency", tmpStm.getInt64(1));
            tags.appendElement(propertyBag, false);
        }
        tmpStm.reset();

        
        tmpStm = null;
    } catch(e) {
        yDebug.print("YDelLocalStore::getAllTags::Error-"+e, YB_LOG_MESSAGE);
        tmpStm.reset();
    }
    
    return tags;
  },

  /**
   * Whenever website is visited via the bookmark link the count on the bookmark is increased.
   * This also updates the last visited time.
   * 
   * @param aUrl url visited
   */
  incrementVisitCount: function(aUrl) {
    try {
        if(!aUrl) return;
        
        this.stmIncrementVisitCount.bindUTF8StringParameter(0, aUrl);
        this.stmIncrementVisitCount.execute();
        this.stmIncrementVisitCount.reset();
        //Increment last_visited as well
        var nowDate = (new Date()).getTime() * 1000;        
        this.setNumericPropertyForBookmark(aUrl, "last_visited", nowDate);
        
        //insert url with visit count 1, increment visit count if present in url_visits
        var dt = this.getURLVisits(aUrl);
        if(dt === "") {
            var sql = "INSERT INTO url_visits VALUES (?1, ?2, ?3)";
            var stm = this._dbConn.createStatement(sql);
            var visitCount = this.getBookmark(aUrl).visit_count;
            
            stm.bindUTF8StringParameter(0, aUrl);
            stm.bindInt64Parameter(1, visitCount);
            stm.bindInt64Parameter(2, nowDate);
            
            stm.execute();
            stm.reset();
        } else {
            var sql = "UPDATE url_visits SET visit_count = visit_count+1, last_visited=?1 WHERE url=?2";
            var stm = this._dbConn.createStatement(sql);

            stm.bindInt64Parameter(0, nowDate);
            stm.bindUTF8StringParameter(1, aUrl);
            
            stm.execute();
            stm.reset();
        }
        
    } catch(e) {
        yDebug.print("YDelLocalStore::incrementVisitCount::Error-"+e, YB_LOG_MESSAGE);
        this.stmIncrementVisitCount.reset();
    }
  },

  /**
   * Check if the given url is present in the bookmark database. 
   * 
   * @param aUrl url of the bookmark to be checked.
   * 
   * @return boolean true if bookmark present, false otherwise.
   *
   */
  isBookmarked: function(aUrl) {
    try {
        var found = false;
        this.stmIsBookmarked.bindUTF8StringParameter(0, aUrl);
        if(this.stmIsBookmarked.executeStep()) {
            found = true;
        }
        this.stmIsBookmarked.reset();
        return found;
    } catch(e) {
	ybookmarksUtils.processDBException(e);
        yDebug.print("YDelLocalStore::isBookmarked::Error-"+e, YB_LOG_MESSAGE);
        this.stmIsBookmarked.reset();
    }
  },

  /* Check if the given url is present in the live bookmark database. 
   * 
   * @param aUrl url of the live bookmark to be checked.
   * 
   * @return true if livmark present, false otherwise.
   */
  isLivemarked: function(aUrl) {
    var found = false;
    try {
        this.stmIsLivemarked.bindUTF8StringParameter(0, aUrl);
        if(this.stmIsLivemarked.executeStep()) {
            found = true;
        }
        this.stmIsLivemarked.reset();
    } catch(e) {
        yDebug.print("YDelLocalStore::isLivemarked::Error-"+e, YB_LOG_MESSAGE);
        this.stmIsLivemarked.reset();
    }
    
    return found;
  },

  /** 
   * Reload the livemark
   * @param aUrl url of the livemark to be reloaded.
   * 
   */
  reloadLivemark: function(aUrl) {
    try {
        var bookmarkId = this._getBookmarkIdFromUrl(aUrl);
        
        if(bookmarkId) this._updateLivemarkChildren(bookmarkId);
    } catch(e) {
        yDebug.print("YDelLocalStore::reloadLivemark::Error-"+e, YB_LOG_MESSAGE);
    }
  },

  /**
   * The last update time is the timestamp provided by the service provider (example del.icio.us). 
   * This value is used to sync the local cache of the bookmarks with the server side bookmarks.
   * Instead of pulling all the bookmarks everytime, client can request for only the new/changed
   * bookmarks.
   *
   * @param timeString time stamp provided by the service provider.
   * 
   */
  setLastUpdateTime: function(timeString) {
    try {
        this.stmReplacePref.bindStringParameter(0, "LAST_UPDATE_TIME");
        this.stmReplacePref.bindStringParameter(1, timeString);
        this.stmReplacePref.execute();
        this.stmReplacePref.reset();
    } catch(e) {
	ybookmarksUtils.processDBException(e);
        yDebug.print("YDelLocalStore::setLastUpdateTime::Error-"+e, YB_LOG_MESSAGE);
        this.stmReplacePref.reset();
    }
  },

  /**
   * Fetch the time stamp stored using setLastUpdateTime method.
   * 
   * @return the timestamp stored using setLastUpdateTime method.
   *
   */
  getLastUpdateTime: function() {
    try {
        var lastUpdateTime = null;
        this.stmGetPref.bindStringParameter(0, "LAST_UPDATE_TIME");
        if(this.stmGetPref.executeStep()) {
            lastUpdateTime = this.stmGetPref.getString(0);
        }
        this.stmGetPref.reset();
        
        return lastUpdateTime;
    } catch(e) {
	ybookmarksUtils.processDBException(e);
        yDebug.print("YDelLocalStore::getLastUpdateTime::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetPref.reset();
    }
  },

  /**
   * Return the bookmark properties given the url
   *
   * @param aUrl url for which properties are requested.
   *
   * @return nsIYBookmark object
   *
   */
  getBookmark: function(aUrl) {
    var bookmarkObject = null;
    try {
        //Check if url is already bookmarked
        var bookmarkId = this._getBookmarkIdFromUrl(aUrl);
        
        if(!bookmarkId) return bookmarkObject;
        
        //Get bookmark using bookmark_id
        this.stmGetBookmarkUsingBookmarkId.bindInt64Parameter(0, bookmarkId);
        if(this.stmGetBookmarkUsingBookmarkId.executeStep()) {
            bookmarkObject = this._getBookmarkObjectFromRow(this.stmGetBookmarkUsingBookmarkId, true);
        }
        this.stmGetBookmarkUsingBookmarkId.reset();
        
    } catch(e) {
        yDebug.print("YDelLocalStore::getBookmark::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetBookmarkUsingBookmarkId.reset();
    }
    return bookmarkObject;
  },

  /**
   * Return the bookmark properties given the shortcut url
   *
   * @param aUrl shortcut url for which properties are requested.
   *
   * @return nsIYBookmark object
   *
   */
  getBookmarkFromShortcutURL: function(aUrl) {
    var bookmarkObject = null;
    try {
        //Check if url is already bookmarked
        var bookmarkId = this._getBookmarkIdFromShortcutUrl(aUrl);
        
        if(!bookmarkId) return bookmarkObject;
        
        //Get bookmark using bookmark_id
        this.stmGetBookmarkUsingBookmarkId.bindInt64Parameter(0, bookmarkId);
        if(this.stmGetBookmarkUsingBookmarkId.executeStep()) {
            bookmarkObject = this._getBookmarkObjectFromRow(this.stmGetBookmarkUsingBookmarkId, true);
        }
        this.stmGetBookmarkUsingBookmarkId.reset();
        
    } catch(e) {
        yDebug.print("YDelLocalStore::getBookmark::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetBookmarkUsingBookmarkId.reset();
    }
    return bookmarkObject;  
  },

  /**
   * Return the url visit count and last visited from seperate table
   *
   * @param aUrl shortcut url for which properties are requested.
   *
   * @return wstring containing visit_count and last_visited seperated by space
   *
   */
  getURLVisits: function(aUrl) {
    try {
        var sql = "SELECT visit_count, last_visited FROM url_visits WHERE url=?1";
        var stm = this._dbConn.createStatement(sql);
        
        stm.bindUTF8StringParameter(0, aUrl);
        
        if(stm.executeStep()) {
            var vcount = stm.getInt32(0);
            var lupdate = stm.getInt64(1);
            
            if(vcount && lupdate) return vcount+" "+lupdate;
        }
    } catch(e) {
        yDebug.print("YDelLocalStore::getURLVisits::Error-"+e, YB_LOG_MESSAGE);
        if(stm) stm.reset();
    }
    
    return "";
  },
  
  /**
   * Search tags
   *
   * @param aKeyword keyword to be searched
   * @return array of tags matching
   */
  searchTags: function( aKeyword, aSortOrder) {
    var tags = new NSArray();
    try {
        if(!aKeyword) return;

        var selectTagFrequency = "SELECT t.name, COUNT(bt.tag_id) as frequency FROM tags as t, bookmarks_tags as bt WHERE t.rowid = bt.tag_id  AND";
        
        var tmpArr = aKeyword.split(" ");
        for(var i=0; i<tmpArr.length; i++) {
            if(i==0) selectTagFrequency += " (t.name LIKE \""+"%"+tmpArr[i].replace(/\"/,'""')+"%\"";
            else selectTagFrequency += " OR t.name LIKE \""+"%"+tmpArr[i].replace(/\"/,'""')+"%\"";
        }
        
        selectTagFrequency += ") GROUP BY t.name";

        var tmpStm = null;
        switch(aSortOrder) {
        case "frequency":
            selectTagFrequency += " ORDER BY frequency DESC, t.name ASC";
            tmpStm = this._dbConn.createStatement(selectTagFrequency);
            break;
        case "alpha":
        default:
            selectTagFrequency += " ORDER BY t.name ASC";
            tmpStm = this._dbConn.createStatement(selectTagFrequency);
        }

        while(tmpStm.executeStep()) {
            var propertyBag = new HashPropertyBag();
            propertyBag.setProperty("name", tmpStm.getUTF8String(0));
            propertyBag.setProperty("frequency", tmpStm.getInt64(1));
            tags.appendElement(propertyBag, false);
        }
        tmpStm.reset();
        
        tmpStm = null;
        
    } catch(e) {
        yDebug.print("YDelLocalStore::searchTags::Error-"+e, YB_LOG_MESSAGE);
    }
    return tags;
  },

  /**
   * Search bookmarks
   *
   * @param aKeyword keyword to be searched
   * @return array of nsIYBookmark objects
   */
  searchBookmarks: function( aKeyword, aSortOrder, aLimit, aCount ) {
    var result = new Array();
    try {
        if(!aKeyword) return;
        
        var tmpStm = null;
        switch(aSortOrder) {
        case "Name":
            tmpStm = this.stmSearchBookmarksByName;
        break;
        case "MostVisited":
            tmpStm = this.stmSearchBookmarksByMostVisited;
        break;
        case "LastVisited":
            tmpStm = this.stmSearchBookmarksByLastVisited;
        break;
        case "Site":
            tmpStm = this.stmSearchBookmarksBySite;
        break;
        case "LastAdded":
        default:
            tmpStm = this.stmSearchBookmarksByLastAdded;
        }
        
        if(!aLimit) aLimit = -1; //negative value indicates no upper bound
        
        aKeyword = aKeyword.split(" ").join("%");
        tmpStm.bindUTF8StringParameter(0, "%"+aKeyword+"%");
        tmpStm.bindUTF8StringParameter(1, "%"+aKeyword+"%");
        tmpStm.bindUTF8StringParameter(2, "%"+aKeyword+"%");
        tmpStm.bindUTF8StringParameter(3, "%"+aKeyword+"%");
        tmpStm.bindInt32Parameter(4, aLimit);
        
        while(tmpStm.executeStep()) {
            var bookmarkObject = this._getBookmarkObjectFromRow(tmpStm, false);
            result.push(bookmarkObject);
        }
        tmpStm.reset();
    
        tmpStm = null;
        
        if(aCount) aCount.value = result.length;
    } catch(e) {
        yDebug.print("YDelLocalStore::searchBookmarks::Error-"+e, YB_LOG_MESSAGE);
        tmpStm.reset();
    }
    return result;
  },


//  **********  TRANSACTIONS ***************************

  /**
   *  Add a transaction (e.g. add, edit and delete bookmark) to the datasource
   *  
   *  @param aAction the type of the transaction
   *  @param aState the state of the transaction   i.e. 0 - uninitialized, 1= sent, 2 = completed
   *  @param aType of the data e.g. bookmark, bundle, favourite_tag
   *  @param aData id locating the bookmark, bundle or tag
   *
   *action = {addBookmark, editBookmark, deleteBookmark, setBundle, deleteBundle}
   *state = {0 - uninitialized, 1 - sent, 2 - completed, 3 - failed}
*/
  addTransaction: function ( aAction, aState, aType, aData) {
    try {
        this._insertIntoTransactions(aAction, aState, aType, aData);
    } catch(e) {
        yDebug.print("YDelLocalStore::addTransaction::Error-"+e, YB_LOG_MESSAGE);
    }
  },
    
  /**
   *  Remove a transaction from the datasource
   *  
   *  @param aAction the type of the transaction
   *  @param aType  the type of data e.g. bookmark, bundle, favourite_tag
   *  @param aData  id locating the bookmark, bundle or tag
   *
   */
  removeTransaction: function ( aAction, aType, aData) {
    try {
        this.stmDeleteFromTransations.bindUTF8StringParameter(0, aAction);
        this.stmDeleteFromTransations.bindUTF8StringParameter(1, aType);
        this.stmDeleteFromTransations.bindUTF8StringParameter(2, aData);
        
        this.stmDeleteFromTransations.execute();
        this.stmDeleteFromTransations.reset();
    } catch(e) {
        yDebug.print("YDelLocalStore::removeTransaction::Error-"+e, YB_LOG_MESSAGE);
        this.stmDeleteFromTransations.reset();
    }
  },

  /**
   *  Remove all transactions in particular state.
   *  
   *  @param aState the state of the transactions. i.e. 0 - uninitialized, 1 - sent, 2 - completed, 3 - failed, 10 - all
   */ 
  removeAllTransactions: function (aState) {
    try {
        if(aState == 10) {
            this.stmEmptyTransactions.execute();
            this.stmEmptyTransactions.reset();
        } else {
            this.stmDeleteTransactionsUsingState.bindInt32Parameter(0, aState);
            this.stmDeleteTransactionsUsingState.execute();
            this.stmDeleteTransactionsUsingState.reset();
        }
    } catch(e) {
        yDebug.print("YDelLocalStore::removeAllTransactions::Error-"+e, YB_LOG_MESSAGE);
        this.stmEmptyTransactions.reset();
        this.stmDeleteTransactionsUsingState.reset();
    }
  },
  
  /**
   *  Set the state of a transaction
   *   
   *  @param aAction the type of the transaction
   *  @param aType of the data e.g. bookmark, bundle, favourite_tag
   *  @param aData id locating the bookmark, bundle or tag
   *  @param aState the state of the transaction   i.e. 0 - uninitialized, 1= sent, 2 = completed, 3 - failed
   *
   */ 
  setTransactionState: function (aAction, aType, aData, aState) {
    try {
        var time = parseInt(((new Date()).getTime())) + "";
        if(aState == 0 || aState == 1 || aState == 2 || aState == 3) {
            this.stmSetTransactionState.bindInt32Parameter(0, aState);
            this.stmSetTransactionState.bindInt64Parameter(1, time);
            this.stmSetTransactionState.bindStringParameter(2, aAction);
            this.stmSetTransactionState.bindStringParameter(3, aType);
            this.stmSetTransactionState.bindStringParameter(4, aData);
            this.stmSetTransactionState.execute();
            this.stmSetTransactionState.reset();
        }
    } catch(e) {
        yDebug.print("YDelLocalStore::setTransactionState::Error-"+e, YB_LOG_MESSAGE);
        this.stmSetTransactionState.reset();
    }
  },
  
  /**
   *  Get all transactions from the datasource
   *  
   *  @return the MutableArray contains all transactions 
   *  and each of them is in hashPropertyBag format 
   *
   */ 
  getTransactions: function () {
    var Ts = new NSArray();

    try {
        while(this.stmGetAllTransactions.executeStep()) {
            var propertyBag = new HashPropertyBag();
            propertyBag.setProperty("action", this.stmGetAllTransactions.getString(0));
            propertyBag.setProperty("state", this.stmGetAllTransactions.getInt32(1));
            propertyBag.setProperty("type", this.stmGetAllTransactions.getString(2));
            propertyBag.setProperty("data", this.stmGetAllTransactions.getString(3));
            propertyBag.setProperty("txn_time", this.stmGetAllTransactions.getInt64(4));
            Ts.appendElement(propertyBag, false);
        }
        this.stmGetAllTransactions.reset();
    } catch(e) {
        yDebug.print("YDelLocalStore::getTransactions::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetAllTransactions.reset();
    }
    
    return Ts;
  },

  getTransactionsOld: function () {
    var Ts = new NSArray();

    try {
        while(this.stmGetAllTransactionsOld.executeStep()) {
            var propertyBag = new HashPropertyBag();
            propertyBag.setProperty("action", this.stmGetAllTransactionsOld.getString(0));
            propertyBag.setProperty("state", this.stmGetAllTransactionsOld.getInt32(1));
            propertyBag.setProperty("type", this.stmGetAllTransactionsOld.getString(2));
            propertyBag.setProperty("data", this.stmGetAllTransactionsOld.getString(3));
            propertyBag.setProperty("txn_time", this.stmGetAllTransactionsOld.getInt64(4));
            Ts.appendElement(propertyBag, false);
        }
        this.stmGetAllTransactionsOld.reset();
    } catch(e) {
        yDebug.print("YDelLocalStore::getTransactionsOld::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetAllTransactionsOld.reset();
    }
    
    return Ts;
  },
  
  /**
   *  Reset the 'sent' and 'failed' transactions to 'uninitialized'
   *  after a period of time
   *
   */
  restateTransactions: function () {
    try {
        var time = parseInt(((new Date()).getTime())) + "";
        
        //first new txn time, second min. required time difference to update txn time
        this.stmResetTransactions.bindInt64Parameter(0, time);
        this.stmResetTransactions.bindInt64Parameter(1, time);
        
        this.stmResetTransactions.execute();
        this.stmResetTransactions.reset();
    } catch(e) {
        yDebug.print("YDelLocalStore::restateTransactions::Error-"+e, YB_LOG_MESSAGE);
        this.stmResetTransactions.reset();
    }
  },
  
  //get transaction object string for bookmarks
  getTransStringForBookmark: function(data) {
    var bkJSON = {};
    try {
	var bookmark = this.getBookmark(data);
	if(bookmark) {
	    var tags = this.getTags(bookmark.url, {});
	    if(tags) {
		tags = tags.join(' ');
	    } else {
		tags = "";
	    }
	    
	    bkJSON.name = bookmark.name;
	    bkJSON.url = bookmark.url;
	    bkJSON.description = bookmark.description;
	    bkJSON.tags = tags;
	    bkJSON.shared = bookmark.shared;
	    bkJSON.shortcut = bookmark.shortcut;
	    bkJSON.postData = bookmark.postData;
	    //bkJSON.localOnly = bookmark.localOnly;
	    //Get recipients and share message.
	    try {
	      if(this._dbConn.tableExists("bookmarks_recipients") && this._dbConn.tableExists("bookmarks_messages")) {
		bkJSON.recipients = this.getSendListForBookmark(bookmark.url);
		bkJSON.share_msg = this.getSendMessageForBookmark(bookmark.url);
	      }
	    } catch(e) {
		yDebug.print("getTransStringForBookmark::recipient/sharemsg Error:" + e, YB_LOG_MESSAGE);
	    }
	}
	var result = YBJSON.stringify(bkJSON);
	return (result == 'null') ? null : result;
    } catch(e) {
	yDebug.print("getTransStringForBookmark::Error:" + e, YB_LOG_MESSAGE);
	return null;
    }
  },
  
  //Creates a String representation of JSON transaction object
  getTransactionJSONString: function(data, itemType, transType) {
    if(!data) {
      return;
    }
    var myJSON = {};
    try {
	switch(itemType) {
	  case "bookmark":
	    if("deleteBookmark" == transType) {
	      myJSON = {url:data};
	    } else {
	      return this.getTransStringForBookmark(data);
	    }
	    break;
	  case "bundle":
	    if("deleteBundle" == transType) {
	      myJSON = {name:data};
	    } else {
	      yDebug.print("transType:" + transType + " data:" + data);
	      var aBundle = this.getBundle(data);
	      if(aBundle) {
		var bTags = ybookmarksUtils.nsArrayToJs(aBundle.tags).join(" ");
		if(bTags) {
		  myJSON = {name:data, tags:bTags};
		}
	      }
	    }
	    break;
	}
	var transStr = YBJSON.stringify(myJSON);
	return (transStr == 'null') ? null : transStr;
    } catch(e) {
        return null;  
    }
  },

  //Migrate transactions to the newer format.
  migrateTransactions: function() {
    try {
      if(this._dbConn.tableExists("transactions")) {
	yDebug.print("Old transaction table exists, Trying migration", YB_LOG_MESSAGE);
	var transactionQueue = this.getTransactionsOld();
	var transactions = transactionQueue.enumerate();
	var transaction, transactionState;
	var total = 0;
	while (transactions.hasMoreElements()) {
	  transaction = transactions.getNext();
	  transaction = transaction.QueryInterface(Components.interfaces.nsIWritablePropertyBag);        
	  if(transaction) {
	    transactionState = transaction.getProperty("state");
	    if (transactionState == 2) { //Skip completed transactions.
	      continue;
	    }
	    var transactionAction = transaction.getProperty("action");
	    var transactionItemType = transaction.getProperty("type");
	    var transObject = this.getTransactionJSONString(transaction.getProperty("data"), transactionItemType, transactionAction);
	    if(transObject) {
	      ++total;
	      this.addTransaction(transactionAction, 0, transactionItemType, transObject);
	    }
	  }
	}
	//DELETE the old transaction realted tables..
	try {
	  this.dropTable("transactions", false);
	  this.dropTable("bookmarks_messages", true);
	  this.dropTable("bookmarks_recipients", true);
	  //this.dropTable("recipients",  true);
	} catch(e){}
	yDebug.print("Transaction migration completed: " + total + " items.", YB_LOG_MESSAGE);
      } else {
	yDebug.print("Old transaction table doesn't exist, No need of migration", YB_LOG_MESSAGE);
      }
    } catch(e) {
      yDebug.print("YDelLocalStore::migrateTransactions::Error:" + e, YB_LOG_MESSAGE);
    }
  },
  
  dropTable: function(tableName, checkIfExists) {
    if(checkIfExists && !this._dbConn.tableExists(tableName)) {
	return;
    }
    this._dbConn.executeSimpleSQL("DROP TABLE " + tableName);
  },
  
  //  **********  END OF TRANSACTIONS ***************************
  
  /**
   *  Get all bookmarks' metahash and urlhash from the datasource
   *  
   *  @return the MutableArray contains all transactions 
   *  and each of them is in hashPropertyBag format 
   *
   */   
  getBookmarkHashes: function () {
    var bookmarks = new NSArray();
    try {
        while(this.stmGetBookmarkHashes.executeStep()) {
            var propertyBag = new HashPropertyBag();
            propertyBag.setProperty("hash", this.stmGetBookmarkHashes.getUTF8String(0));
            propertyBag.setProperty("metahash", this.stmGetBookmarkHashes.getUTF8String(1));
            bookmarks.appendElement(propertyBag, false);
        }
        this.stmGetBookmarkHashes.reset();
    } catch(e) {
        yDebug.print("YDelLocalStore::getBookmarkHashes::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetBookmarkHashes.reset();
    }
    return bookmarks;
  },  
  
  
  /**
   * Delete the bookmark and all its associated tags from the database. If same tag is used by 
   * multiple bookmarks, only the association between bookmark and the tag is removed. Tag is 
   * retained in the system.
   *
   * @param aHash boookmark which contain this url hash would be removed from the system.
   *
   * @return false if url hash is not present in the system, true otherwise.
   *
   */
  deleteBookmarkForHash: function ( aHash ) {
    try {
        var url = null;
        
        this.stmGetBookmarkUrlFromHash.bindUTF8StringParameter(0, aHash);
        if(this.stmGetBookmarkUrlFromHash.executeStep()) {
            url = this.stmGetBookmarkUrlFromHash.getUTF8String(0);
        }
        this.stmGetBookmarkUrlFromHash.reset();
        
        if(url) {
            this.deleteBookmark(url);
            return true;
        } else {
            return false;
        }
    } catch(e) {
        yDebug.print("YDelLocalStore::deleteBookmarkForHash::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetBookmarkUrlFromHash.reset();
    }
  },

  /**
   *  Get the number of transactions in the datasource
   *  
   *  @param aAction the type of the transaction. i.e. addBookmark, editBookmark, deleteBookmark, all/""
   *  @param aType of the data e.g. bookmark, bundle, favourite_tag
   *  @param aState the state of the transactions. i.e. 0 - uninitialized, 1 - sent, 2 - completed, 3 - failed
   *
   *  @return number the number of transactions
   *
   */ 
  getNumberOfTransactions: function ( aAction, aType, aState) {
    var count = 0;
    try {
        //Get count of transactions
        var sqlGetTransactionCount = "SELECT COUNT(rowid) FROM transactions_new WHERE ";

        switch(aAction) {
        case "addBookmark":
                sqlGetTransactionCount += "action='addBookmark' AND type='bookmark' ";
                break;
        case "editBookmark":
                sqlGetTransactionCount += "action='editBookmark' AND type='bookmark' ";
                break;
        case "deleteBookmark":
                sqlGetTransactionCount += "action='deleteBookmark' AND type='bookmark' ";
                break;
        case "setBundle":
                sqlGetTransactionCount += "action='setBundle' AND type='bundle' ";
                break;
        case "deleteBundle":
                sqlGetTransactionCount += "action='deleteBundle' AND type='bundle' ";
                break;
        case "all":
        default:
            sqlGetTransactionCount += "1 ";
        }
        
        

        if(aState == 0 || aState == 1 || aState == 2 || aState == 3) {
            sqlGetTransactionCount += "AND state="+aState;
        } else {
            return count;
        }

        this.stmGetTransactionCount = this._dbConn.createStatement(sqlGetTransactionCount);
        
        if(this.stmGetTransactionCount.executeStep()) {
            count = this.stmGetTransactionCount.getInt32(0);
        }
        this.stmGetTransactionCount.reset();
    } catch(e) {
        yDebug.print("YDelLocalStore::getNumberOfTransactions::Error-"+e, YB_LOG_MESSAGE);
    }
    return count;
  },

  /*
   * Get the tags suggestion based on the keyword input
   *
   * @param aKeyword keyword input
   * 
   */  
  getTagSuggestions: function ( aKeyword, keepExactMatch) {
    var tags = new NSArray();
    try {
        if (! aKeyword || aKeyword.length == 0) {
            return tags;
        }

        if(!keepExactMatch) keepExactMatch = false;

        //var keyword = aKeyword.toLowerCase();
        var keyword = aKeyword;
        var plusIndex = keyword.lastIndexOf('+');
        if (plusIndex == keyword.length - 1) { // the user has typed nothing useful
            return tags;
        }
        if (plusIndex > -1) {
            // reducing search prefix to the last constituent
            keyword = keyword.substring(plusIndex + 1, keyword.length);
        }

        var found = false;
        while(this.stmGetAllTagsOrderFrequency.executeStep()) {
            found = false;
            var tag = this.stmGetAllTagsOrderFrequency.getUTF8String(0);
            //tag = tag.toLowerCase();
            if (tag.toLowerCase().indexOf(keyword.toLowerCase()) == 0 && (tag.length != keyword.length || keepExactMatch)) {
                var childCount = this.stmGetAllTagsOrderFrequency.getInt64(1);
                if (childCount > 0) {
                    var propertyBag = new HashPropertyBag();
                    propertyBag.setProperty("tag", tag);
                    propertyBag.setProperty("count", childCount);
                    tags.appendElement(propertyBag, false);
                }
            }
        }
        this.stmGetAllTagsOrderFrequency.reset();
    } catch(e) {
        yDebug.print("YDelLocalStore::getTagSuggestions::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetAllTagsOrderFrequency.reset();
    }
    return tags;
  },
  
  /**
   * Return the total number of bookmarks in the store
   *
   * @return total number of bookmarks
   */
  getTotalBookmarks: function () {
    var count = 0;
    try {
        if(this.stmGetBookmarkCount.executeStep()) {
            count = this.stmGetBookmarkCount.getInt64(0);
        }
        this.stmGetBookmarkCount.reset();
    } catch(e) {
        yDebug.print("YDelLocalStore::getTotalBookmarks::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetBookmarkCount.reset();
    }
    return count;
  },

  /**
   * Returns total number of tags in the system
   * 
   * @return total number of tags
   */
  getTotalTags: function () {
    var count = 0;
    try {
        if(this.stmGetTagCount.executeStep()) {
            count = this.stmGetTagCount.getInt64(0);
        }
        this.stmGetTagCount.reset();
    } catch(e) {
        yDebug.print("YDelLocalStore::getTotalTags::Error-"+e, YB_LOG_MESSAGE);
        this.stmGetTagCount.reset();
    }
    return count;
  },

  /**
   * Returns total number of bookmarks for a tag
   * 
   * @return total number of bookmarks
   */
  getTotalBookmarksForTag: function ( aTag ) {
    var count = 0;
    try {
        var tagId = this._getTagIdFromTagName(aTag);
        if(tagId) {
            this.stmBookmarksCountForTag.bindInt64Parameter(0, tagId);
            if(this.stmBookmarksCountForTag.executeStep()) {
                count = this.stmBookmarksCountForTag.getInt64(0);
            }
            this.stmBookmarksCountForTag.reset();
        }
    } catch(e) {
        yDebug.print("YDelLocalStore::getTotalBookmarksForTag::Error-"+e, YB_LOG_MESSAGE);
        this.stmBookmarksCountForTag.reset();
    }
    return count;
  },
    /**
     * Writes a line to file
     */
    _writeTextFile: function(aFile, aData, aMode) {
        try {
            if(!aFile) return;
            if(!aMode) aMode = "w";
                                  
            var charset = "UTF-8";
            
            // file is nsIFile, data is a string
            var foStream = CC["@mozilla.org/network/file-output-stream;1"].createInstance(CI.nsIFileOutputStream);
            var os = CC["@mozilla.org/intl/converter-output-stream;1"].createInstance(CI.nsIConverterOutputStream);

            // use 0x02 | 0x10 to open file for appending.
            foStream.init(aFile, ((aMode == "a") ? (0x02 | 0x10) : (0x02 | 0x08 | 0x20)), 0666, 0);

            // This assumes that fos is the nsIOutputStream you want to write to
            os.init(foStream, charset, 0, 0x0000);
            
            if(aData) {
                os.writeString(aData);
            }
            
            os.close();
            foStream.close();
        } catch(e) {
            yDebug.print("YDelLocalStore::_writeTextFile::Error-"+e, YB_LOG_MESSAGE);
        }
    },
    
    /**
     * Read file and return an array
     */
    _readTextFile: function(aFile) {
        try {
            if(!aFile) return;
            
            // open an input stream from file
            var lines = new Array();
            var charset = "UTF-8";
            var istream = CC["@mozilla.org/network/file-input-stream;1"].createInstance(CI.nsIFileInputStream);
            var is = CC["@mozilla.org/intl/converter-input-stream;1"].createInstance(CI.nsIConverterInputStream);

            istream.init(aFile, 0x01, 0444, 0);
            istream.QueryInterface(CI.nsILineInputStream);

            // This assumes that fis is the nsIInputStream you want to read from
            is.init(istream, charset, 1024, 0xFFFD);
            
            if (is instanceof CI.nsIUnicharLineInputStream) {
                var line = {};
                var cont;
                do {
                    cont = is.readLine(line);
                    if(line.value) lines.push(line.value); 
                } while (cont);
            }
            is.close();
            istream.close();
            return lines;
        } catch(e) {
            yDebug.print("YDelLocalStore::_writeTextFile::Error-"+e, YB_LOG_MESSAGE);
        }
    },
    
   /**
    * Get an array of all the Favorite Tags
    *
    * @return an array of strings with the Favorite Tag names in order
    */
    getFavoriteTags: function (aCount) {
        var tags = new Array();
        try {
            if(! this._favTags) {
                this._favTags = this._readTextFile(this._favTagsFile);
                if(! this._favTags) {
                    return tags;
                }
            }
            
            for(var i=0; i< this._favTags.length; i++) {
                var st = this._favTags[i];
                var index = st.lastIndexOf(" ");
                if(index != -1) {
                    tags.push(st.substr(0, index));
                }
            }
            if(aCount) {
                aCount.value = tags ? tags.length : 0;
            }
        } catch(e) {
            yDebug.print("YDelLocalStore::getFavoriteTags::Error-"+e, YB_LOG_MESSAGE);
        }
        return tags;
    },
    
   /**
    * Add a Favorite Tag to the datastore
    * Order for bookmarks 0 - newest first, 1-newest last, 2-alpha, 3-reverse alpha
    */
    addFavoriteTag: function ( aTag ) {
        try {
            if(aTag) {                
                var tags = this.getFavoriteTags({});
                for(var i=0; i<tags.length; ++i) {
                   if(aTag === tags[i]) {
                       //Tag exists. 
                       return;    
                   }
                }
                //default is newest first
                aTag += " "+FAVTAGS_ORDER_DEFAULT;
                this._favTags.push(aTag);
                this._writeTextFile(this._favTagsFile, aTag+"\n", "a"); //append mode
            }
        } catch(e) {
            yDebug.print("YDelLocalStore::addFavoriteTag::Error-"+e, YB_LOG_MESSAGE);
        }
    },
    
   /**
    * Removes a Favorite Tag from the datastore
    */
    deleteFavoriteTag: function ( aTag ) {
        try {            
            var tags = this._favTags;            
            var favTags = this.getFavoriteTags({});
            for(var i=0; i<favTags.length; ++i) {
               if(aTag === favTags[i]) {
                   tags.splice(i, 1);
                   this._favTags = tags;
               }
            }
        } catch(e) {
            yDebug.print("YDelLocalStore::deleteFavoriteTag::Error-"+e, YB_LOG_MESSAGE);
        }
    },
    
   /**
    * Moves a pre-existing Favorite Tag to a particular index.  Datastore indexes are 0 based.
    */
    moveFavoriteTag: function ( aTag, aIndex ) {
        try {            
            var favTags = this.getFavoriteTags({});
            for(var i=0; i<favTags.length; ++i) {
               if(aTag === favTags[i]) {
                    var tags = this._favTags;
                    aTag = tags.splice(i, 1);
                    var belowArr = tags.splice(aIndex, tags.length);
                    tags = tags.concat(aTag, belowArr);
                    this._favTags = tags;
               }
            }
        } catch(e) {
            yDebug.print("YDelLocalStore::moveFavoriteTag::Error-"+e, YB_LOG_MESSAGE);
        }
    },
    
   /**
    * Removes all the Favorite Tags
    */
    clearFavoriteTags: function () {
        try {
            this._favTags = [];
            this._writeTextFile(this._favTagsFile, "", "w");            
        } catch(e) {
            yDebug.print("YDelLocalStore::clearFavoriteTags::Error-"+e, YB_LOG_MESSAGE);
        }
    },
    
   /**
    * Return the bookmarks for a favorite tag in order.
    *
    * @return array of nsIYbookmark
    */
    getBookmarksFromFavoriteTag: function ( aTag, aCount ) {        
        var result = new Array();
        try {
            var order = null;
            var tags = this._favTags;
            if(tags.indexOf(aTag+" 0") != -1) {
                order = "LastAddedReverse";
            } else if(tags.indexOf(aTag+" 1") != -1) {
                order = "LastAdded";
            } else if(tags.indexOf(aTag+" 2") != -1) {
                order = "Name";
            } else if(tags.indexOf(aTag+" 3") != -1) {
                order = "NameReverse";
            } else if(tags.indexOf(aTag+" 4") != -1) {
                order = "MostVisited";
            }
            
            if(order) {                
                var bookmarks = new Array();
                var arr = aTag.split(" ");
                for(var i=0; i<arr.length; i++) {
                     var tagId = this._getTagIdFromFavTagName(arr[i].toLowerCase());
                     var tmpStm = null;
                     var tagBks = new Array();
                     eval("tmpStm = this.stmGetBookmarksUsingTagBy"+order);
                     tmpStm.bindInt64Parameter(0, tagId);
                     tmpStm.bindInt32Parameter(1, -1); //no upper bound
                     while(tmpStm.executeStep()) {
                        var t = this._getBookmarkObjectFromRow(tmpStm, false);
                        tagBks.push(t);
                     }
                     bookmarks.push(tagBks);
                     tmpStm.reset();
                     tmpStm = null;
                }
             
                result = this._getIntersectingBookmarks(bookmarks);
            }
            
            if(aCount) aCount.value = result.length;
            
        } catch(e) {
            yDebug.print("YDelLocalStore::getBookmarksFromFavoriteTag::Error-"+e, YB_LOG_MESSAGE);
            tmpStm.reset();
        }
        return result;
    },

    /**
     * Return the intersection of bookmarks
     * aArrays - an Array of nsISimpleEnumeration that contain bookmark Resources
     */
    _getIntersectingBookmarks : function(aArrays) {
        var bookmarks = [];
        var result = [];

        for (var i = 0; i < aArrays.length; i++) {
          var bmArr = aArrays[i];
          for(var j=0; j < bmArr.length; j++) {
            var bm = bmArr[j];
            var id = bm.id;
            
            //sometimes numeric index value was messing up sorting. so prefixing '_'
            if (! bookmarks["_"+id]) {
              bookmarks["_"+id] = { count : 1, bm : bm };
            } else {
              bookmarks["_"+id].count++;
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

   /**
    * Get the display order preference for a Favorite Tag (i.e chrono, user-specified, alpha-numerical, etc)
    *
    * @return string
    */
    getFavoriteTagOrder: function (aTag) {
        try {
            var order = 1;//default order
            var tags = this._favTags;
            if(!tags) {
                return order;
            }
            if(tags.indexOf(aTag+" 0") != -1) {
                order = 0;
            } else if(tags.indexOf(aTag+" 1") != -1) {
                order = 1;
            } else if(tags.indexOf(aTag+" 2") != -1) {
                order = 2;
            } else if(tags.indexOf(aTag+" 3") != -1) {
                order = 3;
            } else if(tags.indexOf(aTag+" 4") != -1) {
                order = 4;
            }
            return order;
        } catch(e) {
            yDebug.print("YDelLocalStore::getFavoriteTagOrder::Error-"+e, YB_LOG_MESSAGE);
        }
    },
    
   /**
    * Set the display order for the bookmarks of a favorite tag.  This doesn't actually change the order in the datasource 
    * (the order in the datasrouce is always stored in "user-specified" order), it merely 
    * sets a field to the order.
    */
    setFavoriteTagOrder: function ( aTag, aOrder ) {
        try {
            var favTags = this.getFavoriteTags({});
            for(var i=0; i<favTags.length; ++i) {
               if(aTag === favTags[i]) {
                   var tags = this._favTags;
                    tags[i] = aTag+" "+aOrder;
                    this._favTags = tags;
               }
            }
        } catch(e) {
            yDebug.print("YDelLocalStore::setFavoriteTagOrder::Error-"+e, YB_LOG_MESSAGE);
        }
    },

   /**
    * Returns whether aTag is a Favrite Tag
    *
    * @return true or false
    */
    isFavoriteTag: function (aTag) {
        try {            
            var favTags = this.getFavoriteTags({});
            for(var i=0; i<favTags.length; ++i) {
               if(aTag === favTags[i]) {
                   return true;
               }
            }
            return false;
        } catch(e) {
            yDebug.print("YDelLocalStore::isFavoriteTag::Error-"+e, YB_LOG_MESSAGE);
        }
    },
    
    /** 
     * Save favorite tags
     * NOTE: you must call this function while unloading FF to save ur data
     */
    saveFavoriteTags: function () {
        try {
            this._writeTextFile(this._favTagsFile, this._favTags.join("\n"), "w");
        } catch(e) {
            yDebug.print("YDelLocalStore::saveFavoriteTags::Error-"+e, YB_LOG_MESSAGE);
        }
    },
    
   /**
	* Retrieves all the bookmarks for a Livemark
	*
	* @return an array of nsIYBookmark
	*/
    getBookmarksForLivemark: function ( aUrl, aCount ) {
        var bookmarks = new Array();
        try {
            var livemarkId = this._getBookmarkIdFromUrl(aUrl);
            var feedUrl = this.getFeedUrlOfLivemark(livemarkId);
            if(feedUrl) {
                this.stmGetLiveBookmarks.bindUTF8StringParameter(0, feedUrl);
                while(this.stmGetLiveBookmarks.executeStep()) {
                    var name = this.stmGetLiveBookmarks.getUTF8String(0);
                    var url = this.stmGetLiveBookmarks.getUTF8String(1);
                    var type = "LiveBookmark";
                    
                    bookmarks.push({name: name, url: url, type: type});
                }
                this.stmGetLiveBookmarks.reset();
                
                if(aCount) aCount.value = bookmarks.length;
            }
        } catch(e) {
            yDebug.print("YDelLocalStore::getBookmarksForLivemark::Error-"+e, YB_LOG_MESSAGE);
            this.stmGetLiveBookmarks.reset();
        }
        return bookmarks;
    },
    
   /**
	* Return an array of Bundles
	*/
    getBundles: function ( aCount ) {
        var bundles = new Array();
        try {
            while(this.stmGetBundles.executeStep()) {
                var name = this.stmGetBundles.getUTF8String(0);
                var order = this.stmGetBundles.getInt32(1);
                var position = this.stmGetBundles.getInt32(2);
                var tags = this.stmGetBundles.getString(3);
                tags = tags.split(" ");
                var bundle = {name: name, tags: ybookmarksUtils.jsArrayToNs(tags), order: order, position: position};
                bundles.push(bundle);
            }
            
            this.stmGetBundles.reset();
            
            if(aCount) {
                aCount.value = bundles.length;
            }
        } catch(e) {
            yDebug.print("YDelLocalStore::getBundles::Error-"+e, YB_LOG_MESSAGE);
            this.stmGetBundles.reset();
        }
        return bundles;
    },

   /**
	* Return the Bundle for a given bundle name
	*/
    getBundle: function (aBundle) {
        var bundle = null;
        try {
            this.stmGetBundleUsingName.bindUTF8StringParameter(0, aBundle);
            if(this.stmGetBundleUsingName.executeStep()) {
                var name = this.stmGetBundleUsingName.getUTF8String(0);
                var order = this.stmGetBundleUsingName.getInt32(1);
                var position = this.stmGetBundleUsingName.getInt32(2);
                var tags = this.stmGetBundleUsingName.getString(3);
                tags = tags.split(" ");
                bundle = {name: name, tags: ybookmarksUtils.jsArrayToNs(tags), order: order, position: position};
            }
            
            this.stmGetBundleUsingName.reset();
        } catch(e) {
            yDebug.print("YDelLocalStore::getBundle::Error-"+e, YB_LOG_MESSAGE);
            this.stmGetBundleUsingName.reset();
        }
        return bundle;
    },

   /**
	* Adds the the argument bundles to the current set of bundles.
	*/
    setBundles: function (aBundles) {
        try {
            aBundles.QueryInterface(Components.interfaces.nsIArray);
            var position = 0;
            for (var e = aBundles.enumerate(); e.hasMoreElements(); ) {
                var bag = e.getNext().QueryInterface(CI.nsIPropertyBag);
                var name = bag.getProperty("name").
                            QueryInterface(CI.nsISupportsString).data;
                var tags = bag.getProperty("tags").
                            QueryInterface(CI.nsISupportsString).data;
                var order = FAVTAGS_ORDER_DEFAULT;
                tags = tags.split(" ");
                
                //try preserving the order
                var oldBundle = this.getBundle(name);
                if(oldBundle) order = oldBundle.order;
                
                var bundle = {
                    name : name,
                    order: order,
                    tags : ybookmarksUtils.jsArrayToNs(tags),
                    position: position++
                };
            
                this.setBundle(bundle);
            }
        } catch(e) {
            yDebug.print("YDelLocalStore::setBundles::Error-"+e, YB_LOG_MESSAGE);
        }
    },
    
   /**
	* Clears out the Bundles
	*/
    clearBundles: function () {
        try {
            this.stmEmptyBundles.execute();
            this.stmEmptyBundles.reset();
        } catch(e) {
            yDebug.print("YDelLocalStore::clearBundles::Error-"+e, YB_LOG_MESSAGE);
            this.stmEmptyBundles.reset();
        }
    },
    
    setBundle: function (aBundle) {
        try {
            var tags = ybookmarksUtils.nsArrayToJs(aBundle.tags);
            this.stmReplaceBundle.bindUTF8StringParameter(0, aBundle.name);
            this.stmReplaceBundle.bindInt32Parameter(1, aBundle.order);
            this.stmReplaceBundle.bindInt32Parameter(2, aBundle.position);
            this.stmReplaceBundle.bindStringParameter(3, tags.join(" "));
            this.stmReplaceBundle.execute();
            this.stmReplaceBundle.reset();
        } catch(e) {
            yDebug.print("YDelLocalStore::setBundle::Error-"+e, YB_LOG_MESSAGE);
            this.stmReplaceBundle.reset();
        }
    },
    
    deleteBundle: function (aBundle) {
        try {
            this.stmDeleteBundle.bindUTF8StringParameter(0, aBundle.name);
            this.stmDeleteBundle.execute();
            this.stmDeleteBundle.reset();
        } catch(e) {
            yDebug.print("YDelLocalStore::deleteBundle::Error-"+e, YB_LOG_MESSAGE);
            this.stmDeleteBundle.reset();
        }
    },
    
   /**
    * Sets the last upate time for a delicious feed url in delicious.rdf under DeliciousFeedsRoot
    */
    setFeedLastUpdateTime: function (feedURL, lastUpdateTime) {
        try {
            this.stmReplacePref.bindStringParameter(0, feedURL);
            this.stmReplacePref.bindStringParameter(1, lastUpdateTime);
            this.stmReplacePref.execute();
            this.stmReplacePref.reset();
        } catch(e) {
            yDebug.print("YDelLocalStore::setFeedLastUpdateTime::Error-"+e, YB_LOG_MESSAGE);
            this.stmReplacePref.reset();
        }
    },
    
   /**
    * Gets the last upate time for a delicious feed url from delicious.rdf under DeliciousFeedsRoot
    */
    getFeedLastUpdateTime: function (feedURL) {
        try {
            var lastUpdateTime = null;
            this.stmGetPref.bindStringParameter(0, feedURL);
            if(this.stmGetPref.executeStep()) {
                lastUpdateTime = this.stmGetPref.getString(0);
            }
            this.stmGetPref.reset();
        
            return lastUpdateTime;
        } catch(e) {
            yDebug.print("YDelLocalStore::getFeedLastUpdateTime::Error-"+e, YB_LOG_MESSAGE);
            this.stmGetPref.reset();
        }
    },
    
    /**
     * Clear url visit counts and last visited data
     */
    clearURLVisits: function() {
        try {
            var sql = "DELETE FROM url_visits";
            this._dbConn.executeSimpleSQL(sql);
        } catch(e) {
            yDebug.print("YDelLocalStore::clearURLVisits::Error-"+e, YB_LOG_MESSAGE);
        }
    },

  getRecipientRowId: function(provider, recipient) {
        try {
        	var rowId = null;
        	var sql = "SELECT rowid FROM recipients WHERE provider=?1 AND recipient=?2";
        	var stm = this._dbConn.createStatement(sql);
        	
        	stm.bindUTF8StringParameter(0, provider);
        	stm.bindUTF8StringParameter(1, recipient);
        	
        	if(stm.executeStep()) {
				rowId = stm.getInt64(0);
        	}
        	
        	stm.reset();
        	
        	return rowId;
       } catch(e) {
            yDebug.print("YDelLocalStore::getRecipientRowId::Error-"+e, YB_LOG_MESSAGE);
       }
  },
  
  /**
   * update recipient info
   * @param {} provider
   * @param {} recipient
   */
  updateRecipientInfo: function (provider, recipient, frequency) {
        try {
        	yDebug.print("YDelLocalStore::updateRecipientInfo");
        	if(!provider || !recipient) return;
        	
        	var rowId = this.getRecipientRowId(provider, recipient);
        	//if(!lastUsed) lastUsed = "" + ((new Date()).getTime() * 1000);        	
        	if(rowId) {
			//update frequency
			if(frequency) {
			  sql = "UPDATE recipients SET frequency=?1 WHERE rowid=?2";
			  stm = this._dbConn.createStatement(sql);
			  stm.bindInt64Parameter(0, frequency);
			  stm.bindInt64Parameter(1, rowId);
			  stm.execute();
			  stm.reset();
			}
        	} else {
        		//insert new provider
			if(frequency) {
			  sql = "INSERT INTO recipients VALUES (?1, ?2, 11, ?3)";
			} else { //set last used as 10, to show that this didnt have a count, So its a delicious n/w item.
			  sql = "INSERT INTO recipients VALUES (?1, ?2, 10, ?3)";
			}
        		stm = this._dbConn.createStatement(sql);
        		stm.bindUTF8StringParameter(0, provider);
        		stm.bindUTF8StringParameter(1, recipient);
        		stm.bindInt64Parameter(2, frequency);
        		stm.execute();
        		stm.reset();
        	}
        	
        } catch(e) {
            yDebug.print("YDelLocalStore::updateRecipientInfo::Error-"+e, YB_LOG_MESSAGE);
	    stm.reset();
        }
  },

  /**
   * update provider info
   * @param {} aProvider
   * @param {} aUsername
   * @param {} aAuthStatus
   * @param {} aAutoSendPublic
   */
  updateProviderInfo: function (aProvider, aUsername, aAuthStatus, aAutoSendPublic) {
        try {
        		sql = "REPLACE INTO provider_creds VALUES (?1, ?2, ?3, ?4)";
        		stm = this._dbConn.createStatement(sql);
        		stm.bindUTF8StringParameter(0, aProvider);
        		stm.bindUTF8StringParameter(1, aUsername);
        		stm.bindUTF8StringParameter(2, aAuthStatus);
        		stm.bindUTF8StringParameter(3, aAutoSendPublic);
        		stm.execute();
        		stm.reset();
        } catch(e) {
            yDebug.print("YDelLocalStore::updateProviderInfo::Error-"+e, YB_LOG_MESSAGE);
        }  	
  },
  
  /**
   * delete recipient
   */
  deleteRecipient: function(provider, recipient) {
        try {
        	//yDebug.print("YDelLocalStore::deleteRecipient", YB_LOG_MESSAGE);
        	
            if(!provider || !recipient) return;
            var rowId = this.getRecipientRowId(provider, recipient);
	    var stm = null;
            var sql = "DELETE FROM recipients WHERE rowid=?1";
            stm = this._dbConn.createStatement(sql);
            stm.bindInt64Parameter(0, rowId);
            stm.execute();
            stm.reset();
            stm = null;
        } catch(e) {
            yDebug.print("YDelLocalStore::deleteRecipient::Error-"+e, YB_LOG_MESSAGE);
        }
  },

  /**
   * delete all providers
   */
  deleteAllProviders: function() {
        try {
            //yDebug.print("YDelLocalStore::deleteAllProviders", YB_LOG_MESSAGE);
            var sql = "DELETE FROM recipients";
            this._dbConn.executeSimpleSQL(sql);
            sql = "DELETE FROM provider_creds";
            this._dbConn.executeSimpleSQL(sql);
        } catch(e) {
            yDebug.print("YDelLocalStore::deleteAllProviders::Error-"+e, YB_LOG_MESSAGE);
        }
  },
  
  /**
   * Search Recipients
   * @param {} searchString
   * @param {} aCount
   * @return {}
   */
  searchRecipients: function (searchString, aCount) {
        try {
        	//yDebug.print("YDelLocalStore::searchRecipients", YB_LOG_MESSAGE);
        	
        	var arr = new Array();
        	
        	if(!searchString) return arr;
        	
			var sql = "SELECT recipient, frequency FROM recipients WHERE recipient LIKE ?1 ORDER BY provider, recipient";
			var stm = this._dbConn.createStatement(sql);
			
			stm.bindUTF8StringParameter(0, searchString+"%");
			
			while(stm.executeStep()) {
				arr.push(stm.getUTF8String(0) + " " + ((stm.getInt64(1) == 0)? "" : stm.getInt64(1)));
			}
			
			stm.reset();
			
			if(aCount) {
                aCount.value = arr ? arr.length : 0;
            }
            
			return arr;
        } catch(e) {
            yDebug.print("YDelLocalStore::searchRecipients::Error-"+e, YB_LOG_MESSAGE);
        }
  },

	/**
	 * get provider username
	 * @param {} provider
	 * @param {} providerId
	 * @return {String}
	 */
  	getProviderUsername: function( provider ) {
        try {
        	//yDebug.print("YDelLocalStore::getProviderUsername", YB_LOG_MESSAGE);
        	
        	if(!provider) return '';
        	
        	var username = '';
            var sql = "SELECT username FROM provider_creds WHERE provider=?1";
            var stm = this._dbConn.createStatement(sql);
            
            stm.bindUTF8StringParameter(0, provider);
            
            if(stm.executeStep()) {
            	username = stm.getUTF8String(0);
            }
            
            stm.reset();
            stm = null;
            
            return username;
        } catch(e) {
            yDebug.print("YDelLocalStore::getProviderUsername::Error-"+e, YB_LOG_MESSAGE);
        }
  	},

	/**
	 * get provider status
	 * @param {} provider
	 * @param {} providerId
	 * @return {String}
	 */
  	getProviderAuthStatus: function( provider ) {
        try {
        	//yDebug.print("YDelLocalStore::getProviderStatus", YB_LOG_MESSAGE);
        	
        	if(!provider) return '';
        	
        	var status = '';
            var sql = "SELECT auth_status FROM provider_creds WHERE provider=?1";
            var stm = this._dbConn.createStatement(sql);
            
            stm.bindUTF8StringParameter(0, provider);
            
            if(stm.executeStep()) {
            	status = stm.getUTF8String(0);
            }
            
            stm.reset();
            stm = null;

            return status;
        } catch(e) {
            yDebug.print("YDelLocalStore::getProviderStatus::Error-"+e, YB_LOG_MESSAGE);
        }
  	},
 
  	/**
  	 * get provider auto send public status
  	 * @param {} provider
  	 * @return {String}
  	 */
  	getProviderAutoSendPublicStatus: function( provider ) {
        try {
        	//yDebug.print("YDelLocalStore::getProviderStatus", YB_LOG_MESSAGE);
        	
        	if(!provider) return '';
        	
        	var status = '';
            var sql = "SELECT auto_send_public FROM provider_creds WHERE provider=?1";
            var stm = this._dbConn.createStatement(sql);
            
            stm.bindUTF8StringParameter(0, provider);
            
            if(stm.executeStep()) {
            	status = stm.getUTF8String(0);
            }
            
            stm.reset();
            stm = null;

            return status;
        } catch(e) {
            yDebug.print("YDelLocalStore::getProviderStatus::Error-"+e, YB_LOG_MESSAGE);
        }
  	},
  	
	/**
	 * get recipients
	 * @param {} provider
	 * @param {} order
	 * @param {} aCount
	 */
  	getRecipients: function(provider, order, aCount) {
        try {
        	//yDebug.print("YDelLocalStore::getRecipients", YB_LOG_MESSAGE);
        	if(!provider) return;
        	
        	if(!order) order = "alpha";
        	
        	var arr = [];
        	var sql = (order == "frequency") ?
			    "SELECT recipient FROM recipients WHERE provider=?1 AND frequency != 0 ORDER BY frequency DESC, recipient ASC" :
			    "SELECT recipient FROM recipients WHERE provider=?1 ORDER BY recipient ASC";
        	
            var stm = this._dbConn.createStatement(sql);
            
            stm.bindUTF8StringParameter(0, provider);
            
            while(stm.executeStep()) {
            	arr.push(stm.getUTF8String(0));
            }
            
            stm.reset();
            stm = null;
            
 			if(aCount) {
                aCount.value = arr ? arr.length : 0;
            }
            
            return arr;
        } catch(e) {
            yDebug.print("YDelLocalStore::getRecipients::Error-"+e, YB_LOG_MESSAGE);
        }
  	},

  	clearRecipients: function (provider) {
	  try {
	    yDebug.print("YDelLocalStore::clearRecipients", YB_LOG_MESSAGE);
	    
	    if(!provider) return;
		  
	    var sql = "DELETE FROM recipients WHERE provider=?1";
	    var stm = this._dbConn.createStatement(sql);
	    stm.bindUTF8StringParameter(0, provider);
	    stm.execute();
	    stm.reset();
	    
	    stm = null;
	  } catch(e) {
	      yDebug.print("YDelLocalStore::clearRecipients::Error-"+e, YB_LOG_MESSAGE);
	  }  		
  	},
  	  	
    	/**
  	 * get send list for bookmark
  	 * @param {} aUrl
  	 * @return {}
  	 */
	//Currently needed for migration only.
  	getSendListForBookmark: function (aUrl) {
        try {
        	//yDebug.print("YDelLocalStore::getSendListForBookmark", YB_LOG_MESSAGE);
         	var bkId = this._getBookmarkIdFromUrl(aUrl);
        	var pIds = [];
        	var pvds = [];
        	
        	if(bkId) {
        		var sql = "SELECT recipient_id FROM bookmarks_recipients WHERE bookmark_id=?1";
        		var stm = this._dbConn.createStatement(sql);
        		stm.bindInt64Parameter(0, bkId);

        		while(stm.executeStep()) {
        			pIds.push(stm.getInt64(0));
        		}
        		
        		stm.reset();
						
						if(pIds.length == 0) return null;
						
      			sql = "SELECT recipient FROM recipients WHERE rowid IN ("+pIds.join(',')+")";
    			stm = this._dbConn.createStatement(sql);
    			while(stm.executeStep()) {
    				pvds.push(stm.getUTF8String(0)); 
    			}
				stm.reset();
				
        		stm = null;
        	}
        	
        	return pvds.join(' ');
        } catch(e) {
            yDebug.print("YDelLocalStore::getSendListForBookmark::Error-"+e, YB_LOG_MESSAGE);
        }  		
  	},
  	
  	/**
  	 * get send message for bookmark
  	 * @param {} aUrl
  	 * @return {}
  	 */
	//Currently needed for migration only.
  	getSendMessageForBookmark: function (aUrl) {
        try {
        	//yDebug.print("YDelLocalStore::getSendMessageForBookmark", YB_LOG_MESSAGE);
         	var bkId = this._getBookmarkIdFromUrl(aUrl);
        	var msg = null;
        	
        	if(bkId) {
        		var sql = "SELECT msg FROM bookmarks_messages WHERE bookmark_id=?1";
        		var stm = this._dbConn.createStatement(sql);
        		stm.bindInt64Parameter(0, bkId);
        		
        		if(stm.executeStep()) {
        			msg = stm.getUTF8String(0);
        		}
        		
        		stm.reset();
        		
        		stm = null;
        		
        		return msg;
        	}       	        	        	
        } catch(e) {
            yDebug.print("YDelLocalStore::getSendMessageForBookmark::Error-"+e, YB_LOG_MESSAGE);
        }  		
  	},
  	
  	/**
  	 * start updating favicons
  	 */
  	startUpdatingFavicons: function () {
  		try {
  			if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC) {
		        return;
		    }
		    
	        if (!this._faviconTimer) {
              this._faviconTimer = CC[nsTimer].createInstance(nsITimer);
            } else {
              this._faviconTimer.cancel();
            }
		    var refreshInterval = 10;     

		    this._faviconTimer.initWithCallback(this, refreshInterval * 1000,
                CI.nsITimer.TYPE_REPEATING_SLACK);
            //yDebug.print("YDelLocalStore::startUpdatingFavicons Timer initiated", YB_LOG_MESSAGE);
  		} catch(e) {
  			yDebug.print("YDelLocalStore::startUpdatingFavicons::Error-"+e, YB_LOG_MESSAGE);
  		}
  	},
  	
  	/**
  	 * stop updating favicons
  	 */
  	stopUpdatingFavicons: function () {
  		try {
	        if (!this._faviconTimer) {
              return;
            } else {
              this._faviconTimer.cancel();
            }
            //yDebug.print("YDelLocalStore::stopUpdatingFavicons Timer stopped", YB_LOG_MESSAGE);
  		} catch(e) {
  			yDebug.print("YDelLocalStore::stopUpdatingFavicons::Error-"+e, YB_LOG_MESSAGE);
  		}
  	},
  	
	clearLocalStore: function ( onAction ) {
	  try {
	    if(!onAction) return;
	    
	    if(onAction == "logout" || onAction == "uninstall") {
	      this.deleteAllBookmarks(true);
	      this.clearBundles();
	      this.removeAllTransactions(10);
	      this.setLastUpdateTime("");  
	      this.clearFavoriteTags();
	      this.clearURLVisits();
	      this.clearRecipients("email");
	      this.clearRecipients("delicious");
	      this.updateProviderInfo("twitter", "", "false", "false");
	    }
	    
	    if(onAction == "fullsync") {
	      this.deleteAllBookmarks(true);
	      this.clearRecipients("email");
	    }
	    
	    if(onAction == "silent-logout") {
	      this.deleteAllBookmarks(true);
	      this.clearBundles();
	      this.setLastUpdateTime("");
	      this.clearRecipients("email");
	    }
	  } catch(e) {
		  yDebug.print("YDelLocalStore::clearLocalStore::Error-"+e, YB_LOG_MESSAGE);
	  }
	},
	
	/**
	 * Retrieves a bookmark for hash
	 * @param {hash} String
	 * @return {bookmark} nsYBookmark
	 */
	getBookmarkForHash: function (aHash) {
		try {
  		var bkObj = null;
  		
  		if(!aHash) return bkObj;
  		
  		var sql = "SELECT bookmarks.rowid, bookmarks.* FROM bookmarks WHERE hash=?1";
  		var stm = this._dbConn.createStatement(sql);
  		stm.bindStringParameter(0, aHash);
  		
  		if(stm.executeStep()) {
  			bkObj = this._getBookmarkObjectFromRow(stm, true);
  		}
  		
  		stm.reset();
  		
  		stm = null;
  		return bkObj;			
		} catch(e) {
			yDebug.print("YDelLocalStore::getBookmarkForHash::Error "+e, YB_LOG_MESSAGE);
		}
	},
	
	/**
	 * Delete all the private bookmarks
	 */
	deleteAllPrivateBookmarks: function () {
		var sql = 'DELETE FROM bookmarks WHERE shared="false"';
		var stm = this._dbConn.createStatement(sql);
		
		stm.execute();
		
		stm.reset();
		
		stm = null;
		
		var os = Components.classes["@mozilla.org/observer-service;1"]
                   .getService(Components.interfaces.nsIObserverService);                  
    os.notifyObservers(null, "ybookmark.updateBookmarksView", "");
	}
}


/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
var NSGetFactory = XPCOMUtils.generateNSGetFactory([nsYDelLocalStore]);
else
var NSGetModule = XPCOMUtils.generateNSGetModule([nsYDelLocalStore]);