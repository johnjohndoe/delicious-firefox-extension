Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

const ybPrefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

const DEL_CLASS_ID = Components.ID("CF2E16CE-44FD-11DE-A597-400056D89593");
const DEL_CLASS_NAME = "Delicious Sharing Autocomplete Search";
const DEL_CONTRACT_ID = "@mozilla.org/autocomplete/search;1?name=delicious-share";

const RESULT_WAIT = 150;

/**
 * Load required js files
 */
( ( Cc["@mozilla.org/moz/jssubscript-loader;1"] ).getService( 
     Ci.mozIJSSubScriptLoader ) ).loadSubScript( 
        "chrome://ybookmarks/content/yDebug.js" ); 

( ( Cc["@mozilla.org/moz/jssubscript-loader;1"] ).getService( 
     Ci.mozIJSSubScriptLoader ) ).loadSubScript( 
        "chrome://ybookmarks/content/ybookmarksUtils.js" ); 

//Implements nsIAutoCompleteSearchResult
function deliciousShareAutoCompleteResult(searchString, searchResult,
                                  defaultIndex, errorDescription,
                                  results)
{
  this._searchString = searchString;
  this._searchResult = searchResult;
  this._defaultIndex = defaultIndex;
  this._errorDescription = errorDescription;
  this._results = results;
}

deliciousShareAutoCompleteResult.prototype = {
  _searchString: "",
  _searchResult: 0,
  _defaultIndex: 0,
  _errorDescription: "",
  _results: [],

  get searchString()
  {
    return this._searchString;
  },

  get searchResult()
  {
    return this._searchResult;
  },

  get defaultIndex()
  {
    return this._defaultIndex;
  },

  get errorDescription()
  {
    return this._errorDescription;
  },

  get matchCount()
  {
    return this._results.length;
  },

  getCommentAt: function(index){
    if(!this._results || index >= this._results.length){
      return null;
    }
    return this._results[index].comment;
  },

  getImageAt: function(index){
    if(!this._results || index >= this._results.length){
      return null;
    }
    return this._results[index].image;
  },

  getStyleAt: function(index){
    if(!this._results || index >= this._results.length){
      return null;
    }
    return this._results[index].style;
  },

  getValueAt: function(index){
    if(!this._results || index >= this._results.length){
      return null;
    }
    return this._results[index].value;
  },

  removeValueAt: function(index, removeFromDb){ },

  QueryInterface: function(aIID)
  {
    if (!aIID.equals(Ci.nsIAutoCompleteResult) && !aIID.equals(Ci.nsISupports))
        throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
};
		
// Implements nsIAutoCompleteSearch
function deliciousShareAutoCompleteSearch() { };

deliciousShareAutoCompleteSearch.prototype = {
	//nsISupports
	classDescription: DEL_CLASS_NAME,
	contractID: DEL_CONTRACT_ID,
	classID: DEL_CLASS_ID,
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIAutoCompleteSearch]),

  _listener: null,
  _results: null,
  _searchString: null,
 
  startSearch: function delicious_start_search(searchString, searchParam, result, listener)
  {
    try {
		this._results = [];
		this._listener = listener;
		this._searchString = searchString;
		
		//add a timer for result   
    	if (!this._timer) {
          this._timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        } else {
          this._timer.cancel();
        }
        
		if(ybookmarksUtils.trimStr(searchString)) {
			var sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
				          getService(Components.interfaces.nsIYDelLocalStore);
            var data = sqliteStore.searchRecipients(searchString, {});

            if(data) {
            	for(var i=0; i<data.length; i++) {
            		var rcp = data[i].split(" ")[0];
            		var frq = data[i].split(" ")[1];
            		
            		if(rcp.indexOf('@') == -1) {
            			this._results.push({
            				value: rcp,
            				comment: data[i],
            				style: 'delicious',
            				image: ''
            			});
            		} 
            		else if(rcp.indexOf('@') == 0) {
            			//check if twitter oauth is enabled
            			if(rcp == "@twitter" && sqliteStore.getProviderAuthStatus(DEL_PROVIDER_TWITTER)) {
	            			this._results.push({
	            				value: rcp,
	            				comment: "@twitter "+frq,
	            				style: 'twitter',
	            				image: ''
	            			});
            			}
            		}
            		else {
        			 	this._results.push({
        					value: rcp,
        					comment: data[i],
        					style: 'email',
        					image: ''
        				});

            		}
            	}
            }
		}
    	
        this.processResult();
	} catch(e) {
	    yDebug.print("delShareAutoCompleteSearch::startSearch::Error"+e, YB_LOG_MESSAGE);
	}
  },
  
  processResult: function() {
    try {
        this._timer.initWithCallback(this, RESULT_WAIT, Ci.nsITimer.TYPE_ONE_SHOT);
	} catch(e) {
	    yDebug.print("delShareAutoCompleteSearch::processResult::Error", YB_LOG_MESSAGE);
	}
  },
 
  notify: function(aTimer) {
    try {
	    if(this._results.length > 0) {
	      this._listener.onSearchResult(this, new deliciousShareAutoCompleteResult(this._searchString, Ci.nsIAutoCompleteResult.RESULT_SUCCESS, 0, "", this._results));
	    } else{
	      this._listener.onSearchResult(this, new deliciousShareAutoCompleteResult(this._searchString, Ci.nsIAutoCompleteResult.RESULT_NOMATCH, 0, "", this._results));
	    }
    } catch(e) {
        yDebug.print("delShareAutoCompleteSearch::notify:Error-"+e, YB_LOG_MESSAGE);
    }
  },
  
  //Stop at search
  stopSearch: function(){
    try {
        if (this._timer) {
          this._timer.cancel();
        }
    } catch(e) {
        yDebug.print("delShareAutoCompleteSearch::stopSearch:Error-"+e, YB_LOG_MESSAGE);
    }
 }
};


/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
 */
if (XPCOMUtils.generateNSGetFactory)
var NSGetFactory = XPCOMUtils.generateNSGetFactory([deliciousShareAutoCompleteSearch]);
else
var NSGetModule = XPCOMUtils.generateNSGetModule([deliciousShareAutoCompleteSearch]);