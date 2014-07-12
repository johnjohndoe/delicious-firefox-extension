Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

const DEL_CLASS_ID = Components.ID("3ED8F9B4-53FC-49da-B7BD-01A7B22EABDF");
const DEL_CLASS_NAME = "Delicious Autocomplete Search";
const DEL_CONTRACT_ID = "@mozilla.org/autocomplete/search;1?name=delicious";


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
function deliciousAutoCompleteResult(result, search_result, maxNumResults) {
	if(processed_results) { return; }
	this._result		= result;
	this._search_result	= search_result;
	this._maxNumResults	= maxNumResults;
}

deliciousAutoCompleteResult.prototype = {
	get searchString(){
		try{
			return this._result.searchString;
		}
		catch(e){
			return "";
		}
	},
	
	get searchResult(){
		try{
			switch(this._result.searchResult){
				case Ci.nsIAutoCompleteResult.RESULT_NOMATCH:
					if(this._search_result.values == null)				return Ci.nsIAutoCompleteResult.RESULT_NOMATCH_ONGOING;
					else if(this._search_result.values.length > 0)		return Ci.nsIAutoCompleteResult.RESULT_SUCCESS;
					else if(this._search_result.values.length == 0)		return Ci.nsIAutoCompleteResult.RESULT_NOMATCH;
					break;
				case Ci.nsIAutoCompleteResult.RESULT_SUCCESS:
					if(this._search_result.values == null)				return Ci.nsIAutoCompleteResult.RESULT_SUCCESS_ONGOING;
					else if(this._search_result.values.length > 0)		return Ci.nsIAutoCompleteResult.RESULT_SUCCESS;
					else if(this._search_result.values.length == 0)		return Ci.nsIAutoCompleteResult.RESULT_SUCCESS;
					break;
				case Ci.nsIAutoCompleteResult.RESULT_NOMATCH_ONGOING:
					if(this._search_result.values == null)				return Ci.nsIAutoCompleteResult.RESULT_NOMATCH_ONGOING;
					else if(this._search_result.values.length > 0)		return Ci.nsIAutoCompleteResult.RESULT_SUCCESS_ONGOING;
					else if(this._search_result.values.length == 0)		return Ci.nsIAutoCompleteResult.RESULT_NOMATCH_ONGOING;
					break;
				case Ci.nsIAutoCompleteResult.RESULT_SUCCESS_ONGOING:
					if(this._search_result.values == null)				return Ci.nsIAutoCompleteResult.RESULT_SUCCESS_ONGOING;
					else if(this._search_result.values.length > 0)		return Ci.nsIAutoCompleteResult.RESULT_SUCCESS_ONGOING;
					else if(this._search_result.values.length == 0)		return Ci.nsIAutoCompleteResult.RESULT_SUCCESS_ONGOING;
					break;
				default:
					return this._result.searchResult;
			}
		}
		catch(e){}
	},
	
	get defaultIndex(){
		if(this._result.defaultIndex == -1 && this._search_result.values != null && this._search_result.values.length > 0){
			return 0;
		}
		return this._result.defaultIndex;
	},
	
	get errorDescription(){
		return this._result.errorDescription;
	},
	
	get matchCount(){
		try{
			var numResults = Math.min(this._result.matchCount, this._maxNumResults);
			if(this._search_result.values != null){
				numResults += this._search_result.values.length;
			}
			return numResults;
		}
		catch(e){
			return 0;
		}
	},
	
	getLabelAt: function(index) { return this.getValueAt(index); },
	
	getValueAt: function(index){//#1
		try{
			var numResults = Math.min(this._result.matchCount, this._maxNumResults);
			if(index < numResults){
				return this._result.getValueAt(index);
			}
			else{
				//Hack because of duplicate array printing
				if(this._search_result.last[index - numResults]){
					processed_results = true;
				}
				return this._search_result.values[index - numResults];
			}
		}
		catch(e){
			return "";
		}
	},
	
	getCommentAt: function(index){//#3
		try{
			var numResults = Math.min(this._result.matchCount, this._maxNumResults);
			if(index < numResults){
				return this._result.getCommentAt(index);
			}
			else{
				return this._search_result.comments[index - numResults];
			}
		}
		catch(e){
			return "";
		}
	},
	
	getStyleAt: function(index){//#4
		try{
			var numResults = Math.min(this._result.matchCount, this._maxNumResults);
			if(index < numResults){
				return this._result.getStyleAt(index);
			}
			else{
				return "deliciousonly";
			}
		}
		catch(e){
			return "deliciousonly";
		}
	},
	
	getImageAt: function(index){//#2
		try{
			var numResults = Math.min(this._result.matchCount, this._maxNumResults);
			if(index < numResults){
				return this._result.getImageAt(index);
			}
			else{
				return this._search_result.images[index - numResults];
			}
		}
		catch(e){
			return "";
		}
	},
	
	removeValueAt: function(index, removeFromDb){
		try{
			var numResults = Math.min(this._result.matchCount, this._maxNumResults);
			if(index < numResults){
				return this._result.removeValueAt(index, removeFromDb);
			}
			else{
				this._search_result.values.splice(index - numResults, 1);
				this._search_result.comments.splice(index - numResults, 1);
				this._search_result.images.splice(index - numResults, 1);
			}
		}
		catch(e){}
	},

  QueryInterface: function(aIID)
  {
    if (!aIID.equals(Ci.nsIAutoCompleteResult) && !aIID.equals(Ci.nsISupports))
        throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
};


// Implements nsIAutoCompleteSearch
function deliciousAutoCompleteSearch() { 
    this._Prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
};

deliciousAutoCompleteSearch.prototype = {
	//nsISupports
	classDescription: DEL_CLASS_NAME,
	contractID: DEL_CONTRACT_ID,
	classID: DEL_CLASS_ID,
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIAutoCompleteSearch]),
	
  _listener: null,
  _results: null,
  _searchString: null,
  _Prefs: null,
 
  startSearch: function delicious_start_search(searchString, searchParam, result, listener)
  {
    try {
        //Reset flag
		processed_results = false;
		
        this._searchString = searchString;
        
		//Hide history results if >> or ?? used
        if((this._Prefs.getBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousTags") && 
        this._searchString.length > 2 && this._searchString.indexOf(">>") == 0) ||
        (this._Prefs.getBoolPref("extensions.ybookmarks@yahoo.awesomebar.showOnlyDeliciousSearch") && 
        this._searchString.length > 2 && this._searchString.indexOf("??") == 0)) {
			var num_history_results = 0;
			var history_string		= "";
		}
		else{
			var num_history_results = this._Prefs.getIntPref("extensions.ybookmarks@yahoo.awesomebar.maxHistoryRows");
			var history_string		= searchString;
		}
		
		//Search the user's history
		this.historyAutoComplete		= Components.classes["@mozilla.org/autocomplete/search;1?name=history"].createInstance(Components.interfaces.nsIAutoCompleteSearch);
		var _search						= this;
		_search._result					= null;
		var internal_results			= {values: [], comments: [], images: [], last: []};
		autoCompleteObserver = {
			onSearchResult: function(search, result){
				_search._result = result;
				listener.onSearchResult(_search, new deliciousAutoCompleteResult(result, internal_results, num_history_results));
			}
		};
		this.historyAutoComplete.startSearch(history_string, searchParam, null, autoCompleteObserver);
		    	
    	var delsqlite = Cc["@yahoo.com/nsYDelLocalStore;1"].getService(Ci.nsIYDelLocalStore);	
    	        
        var orderBy = this._Prefs.getCharPref("extensions.ybookmarks@yahoo.awesomebar.deliciousSearchOrderBy");
     
        var maxRows = this._Prefs.getIntPref("extensions.ybookmarks@yahoo.awesomebar.maxRowsInDeliciousSearch");
        if(!maxRows) maxRows = 10;
            
      	//check for char '>>' if it is followed by other chars search for bookmarks for this tag
      	if(this._searchString.length > 2 
      	&& this._searchString.indexOf(">>") == 0) {
      	    var q = this._searchString.substr(2);
      	    
      	    //trim the input
      	    q = ybookmarksUtils.trimStr(q);
      	    
      	    if(q) {
      	        data = delsqlite.getBookmarks(q, null, orderBy, maxRows, {});
      	    }

        //check for ?? prefix
      	} else if(this._searchString.length > 2 
      	&& this._searchString.indexOf("??") == 0) {
            
      	    var q = this._searchString.substr(2);

      	    //trim the input
      	    q = ybookmarksUtils.trimStr(q);
      	    
      	    if(q) {
      	        data = delsqlite.searchBookmarks(q, orderBy, maxRows, {});
      	    }
      	} else {
            data = delsqlite.searchBookmarks(ybookmarksUtils.trimStr(this._searchString), orderBy, maxRows, {});
    	}
        
	    for(var i=0; i<data.length;i++){
		    var bkmk = data[i];
    	
		    //Replace HTML characters
		    var htmlReplaceThese = new Array('&amp;','&quot;', '&#39;');
		    var htmlReplaceWith = new Array('&','"', '\'');
		    var barTitle = bkmk.name;
		    var tags = delsqlite.getTags(bkmk.url, {}).join(",");
		    if(tags) {
		        barTitle += " \u2013 " + tags;
		    }
		    var barURL = bkmk.url;
		    var iconURL = (bkmk.icon) ? bkmk.icon : "chrome://mozapps/skin/places/defaultFavicon.png";

		    for(j=0; j<htmlReplaceThese.length; j++){
			    barTitle = barTitle.replace(htmlReplaceThese[j], htmlReplaceWith[j], "g");
		    }
    		
            //Push the result onto the queue
            internal_results.values.push(barURL);
            internal_results.comments.push(barTitle);
            internal_results.images.push(iconURL);
            internal_results.last.push(false);
        }
            
        if(_search._result != null)	listener.onSearchResult(_search, new SearchAutoCompleteResult(_search._result, internal_results , maxRows));
    	
	} catch(e) {
	    yDebug.print("delAutoCompleteSearch::startSearch::Error"+e, YB_LOG_MESSAGE);
	}
  },
    
  //Stop at search
  stopSearch: function(){
    //stop only if processing
    if((this._Prefs.getBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousTags") && 
    this._searchString.length > 2 && this._searchString.indexOf(">>") == 0) ||
    (this._Prefs.getBoolPref("extensions.ybookmarks@yahoo.awesomebar.showOnlyDeliciousSearch") && 
    this._searchString.length > 2 && this._searchString.indexOf("??") == 0)) {
        return false;
    }
    
    this.historyAutoComplete.stopSearch();
    return true;
  }
};


/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
 */
if (XPCOMUtils.generateNSGetFactory)
var NSGetFactory = XPCOMUtils.generateNSGetFactory([deliciousAutoCompleteSearch]);
else
var NSGetModule = XPCOMUtils.generateNSGetModule([deliciousAutoCompleteSearch]);