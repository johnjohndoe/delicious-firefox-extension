var gYBLoginWindow = null;

var YBidManager = {

  _syncService : Components.classes["@mozilla.org/ybookmarks-sync-service;1"].
              getService(Components.interfaces.nsIYBookmarkSyncService),
  _windowMediator : Components.classes["@mozilla.org/appshell/window-mediator;1"].
                       getService(Components.interfaces.nsIWindowMediator),
  _sqliteStore : Components.classes["@yahoo.com/nsYDelLocalStore;1"].
				          getService(Components.interfaces.nsIYDelLocalStore),
  _socialStoreService : Components.classes["@yahoo.com/socialstore/delicious;1"].
                             getService(Components.interfaces.nsISocialStore),                          
  _prefs : Components.classes["@mozilla.org/preferences-service;1"].
             getService(Components.interfaces.nsIPrefBranch),

   setLastUsername: function( username ) {
      yDebug.print( "Last user name set to " + username );

      this._prefs.setCharPref(
         "extensions.ybookmarks@yahoo.login.last", username);
   },

  observe: function( subject, topic, data ) {  	
    try {
		if (topic == "ybookmark.userChanged" && data == "silentlogout") {
			this._silentLogout();
			return;
	   }
	   else if ( data == "loggedin" ) {
	    	//Find re-login / User change.
	    	var userChanged = false;    	
	    	var del = Components.classes["@yahoo.com/socialstore/delicious;1"]
	                 .getService( Components.interfaces.nsISocialStore );      
	        var username = del.getUserName();
	        var lastLogin = null;            
	        try {
	          lastLogin = this._prefs.getCharPref("extensions.ybookmarks@yahoo.login.last");
	        } catch (e) {}
	        userChanged = (username != lastLogin);
	        if (userChanged) {
	        	
		       this._loginChanged();
		    } else {
		       this._loggedIn();
		    }    	
	    } else if ( data == "loggedout") {
	    	this._loggedOut();
	    	return;
	    } else if (data == "cookie_expired") {
	    	this._cookieExpired();
	    	return;
	    }
    } catch (e) {
    	yDebug.print("idManager.js::observe()=>Exception: "+e,YB_LOG_MESSAGE);
    }
  },

  _loggedIn: function() {
  	yDebug.print("idManager.js::YBidManager::_loggedIn",YB_LOG_MESSAGE);
    var recentWindow = 
      this._windowMediator.getMostRecentWindow("navigator:browser");
    var del = Components.classes["@yahoo.com/socialstore/delicious;1"]
	                 .getService( Components.interfaces.nsISocialStore );      
    var username = del.getUserName();
    this.setLastUsername(username);
    ybookmarksMain.setLoggedInState(username);
    
    if (this._isEngineInstalled() ) {
      if (recentWindow == window) {
        setTimeout(function(syncService, socialStoreService) { 
                     syncService.allowSync(); 
                     syncService.sync(true);
                     socialStoreService.allowImportPolling();
                      
                   }, 2000, this._syncService, this._socialStoreService);
      }
    }
  },

  _loginChanged: function() {
  	yDebug.print("idManager.js::YBidManager::_loginChanged",YB_LOG_MESSAGE);
    var recentWindow =
      this._windowMediator.getMostRecentWindow("navigator:browser");
    var del = Components.classes["@yahoo.com/socialstore/delicious;1"]
	             .getService( Components.interfaces.nsISocialStore );      
    var username = del.getUserName();
    if (username) {
      this.setLastUsername(username);
      ybookmarksMain.setLoggedInState(username);
    }
    else {
      ybookmarksMain.setLoggedOutState();
    }
    
    if (this._isEngineInstalled() ) { 
      if (recentWindow == window) {
        this._cancelSync();
        if (username) {
          this._removeUsersBookmarksStore();
          setTimeout(function(syncService, socialStoreService) { 
                       syncService.allowSync(); 
                       syncService.sync(true);
                       socialStoreService.allowImportPolling();
                     }, 2000, this._syncService, this._socialStoreService);
        }
      }
    }
  },

    
    _silentLogout: function( ) {
  	yDebug.print("idManager.js::YBidManager::_silentLogout",YB_LOG_MESSAGE);

    ybookmarksMain.setLoggedOutState();
    
    if (this._isEngineInstalled() ) {
        this._cancelSync();
        this._socialStoreService.disallowImportPolling();
        //Keep local copy of bookmarks, We ask user via the above dialog to keep/remove
        YBidManager.keepPublicBookmarks();        

        //sqlite
        this._sqliteStore.setLastUpdateTime("-1");
    }
  },
  
  _loggedOut: function( ) {
  	yDebug.print("idManager.js::YBidManager::_loggedOut",YB_LOG_MESSAGE);
    var recentWindow =
      this._windowMediator.getMostRecentWindow("navigator:browser");

    ybookmarksMain.setLoggedOutState();
    
    if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)  {
    	//No need to show loggedout dialog in classic mode.
    	return;
    }
    
    if (this._isEngineInstalled() ) {
      if (recentWindow == window) {    
        var rv = {  remove : false };
        
        this._cancelSync();
        this._socialStoreService.disallowImportPolling();
        
        var showDialog = this._prefs.getBoolPref("extensions.ybookmarks@yahoo.showLoggedOutDialog");
        if(showDialog) {
         window.openDialog( "chrome://ybookmarks/content/loggedOut.xul",
                        "LoggedOut",
                            "chrome,dialog,centerscreen,modal,resizable=no", rv);
        } else {
         var status = this._prefs.getCharPref("extensions.ybookmarks@yahoo.delicious.logout.status");
         if(status == "remove") rv.remove = true;
        }

        //Keep public bookmarks, We ask user via the above dialog to keep/remove
        YBidManager.keepPublicBookmarks();
        if (rv.remove) {
          try {
              this._prefs.setCharPref("extensions.ybookmarks@yahoo.delicious.logout.status", "remove");
          } catch(e) {}
          this._removeUsersBookmarksStore();          
        }
        else {
          //force a partial sync if the same user login again
          //sqlite
          this._sqliteStore.setLastUpdateTime("-1");
          try {
              this._prefs.setCharPref("extensions.ybookmarks@yahoo.delicious.logout.status", "keep");
          } catch(e) {}
        }
        Components.classes["@mozilla.org/observer-service;1"]
           .getService(Components.interfaces.nsIObserverService)
           .notifyObservers(null, "ybookmark.logOutStatus", "");
      }
    }
  },
  
  _cookieExpired: function() {
	var recentWindow =
      this._windowMediator.getMostRecentWindow("navigator:browser");
    ybookmarksMain.setLoggedOutState();    
    if (this._isEngineInstalled() ) {
      if (recentWindow == window) {
		this._cancelSync();
		this._socialStoreService.disallowImportPolling();
		YBidManager.keepPublicBookmarks();
		//force a partial sync if the same user login again
		//sqlite
		this._sqliteStore.setLastUpdateTime("-1");
      }
    }	  	
  },
  
  _isEngineInstalled : function() {
      var installed = false;
      var strings = document.getElementById("ybookmarks-strings");
      var newVersionNum = strings.getString("extensions.ybookmarks.versionNum");
      	yDebug.print("idManager.js::YBidManager::_isEngineInstalled()=>newVersionNum= "+newVersionNum,
      		YB_LOG_MESSAGE);
      
      try {
      	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefBranch);
      	var oldVersionNum = prefs.getCharPref("extensions.ybookmarks@yahoo.version.number");
      	   	yDebug.print("idManager.js::YBidManager::_isEngineInstalled()=>oldVersionNum= "+oldVersionNum,
      		YB_LOG_MESSAGE);
   
      }catch (e){
      	yDebug.print("idManager.js::YBidManager::_isEngineInstalled()=>Engine not installed",
      		YB_LOG_MESSAGE);
      }               
      if(newVersionNum == oldVersionNum){
  		installed = true;
		yDebug.print("idManager.js::YBidManager::_isEngineInstalled()=>Engine installed",
      		YB_LOG_MESSAGE);
   	  }
   	  return installed;
  },
  
  /**
   *  Cancel the sync
   *
   */
  _cancelSync : function() {
  
     this._syncService.cancelSync();
  },
  
    /**
   *  Remove bookmarks,bundles and transactions list.
   *
   */
  _removeUsersBookmarksStore : function() {
     this._sqliteStore.clearLocalStore("logout");
     ybToolbar.refreshCurrentView();
  },
  
/*  logoutWindowShown: function() {
    var bundle, serviceName, str, elt, i;

    bundle = document.getElementById( "strbndl_idManager");

    str = bundle.getFormattedString( "extensions.ybookmarks.loggedOut.dialog.title", [ serviceName ] );
    document.title = str;
  },
*/  
  onLogoutWindowAccept: function(event) {
    var radio = document.getElementById("ybLoggedOut-radio");
    var keepRadio = document.getElementById("ybLoggedOut-radio-keep");
    var remember = document.getElementById("ybRememberDecision");
    
    if (radio.selectedItem == keepRadio) {
      YBidManager.keepPublicBookmarks();
    } else {
      YBidManager.removeLocalContent();
    }
    
    if(remember.checked) {
      this._prefs.setBoolPref("extensions.ybookmarks@yahoo.showLoggedOutDialog", false);
    }
    return true;
  },
  

  keepPublicBookmarks: function() {
  try {
   window.arguments[0].remove = false;
    
   //remove all the private bookmarks
   this._sqliteStore.deleteAllPrivateBookmarks();
   
  } catch(e) { //do nothing
  }
    //window.close();
  },

  removeLocalContent: function() {
  try {
    window.arguments[0].remove = true;
  } catch(e) {
    // do nothing
  }
    //window.close();
  },

  isUserLoggedIn: function() {    
  	try {
  	    var silentMode = Components.classes["@mozilla.org/preferences-service;1"]
                         .getService(Components.interfaces.nsIPrefBranch)
                         .getBoolPref("extensions.ybookmarks@yahoo.delicious.silentlogout");
        if(silentMode) {
            return false;
        }                 
    } catch(e) {}
    return (this._socialStoreService.getUserName() ? true : false);
  },

  promptUserLogin: function(tagCurTab) {  	
      try {        
        var silentMode = YBidManager._prefs.getBoolPref("extensions.ybookmarks@yahoo.delicious.silentlogout");
      } catch(e) {}                   
      
      if(silentMode) {
		var cb = {	
		    _tagCurrWindow : null,	    		    
		    onload: function (event) {		    
		     try {
		         yDebug.print("YBidManager.js::promptUserLogin()=>Onload.", YB_LOG_MESSAGE);
    	         YBidManager._prefs.setBoolPref("extensions.ybookmarks@yahoo.delicious.silentlogout", false);
    	         var os = Components.classes["@mozilla.org/observer-service;1"]
                   .getService(Components.interfaces.nsIObserverService);                  
                 os.notifyObservers(null, "ybookmark.userChanged", "loggedin");                 
		         if(this._tagCurrWindow) {
		            os.notifyObservers(null, "ybookmark.addBookmark", "currentWindow");		         
		         }
                 yDebug.print("YBidManager.js::promptUserLogin()=>Onload completed.", YB_LOG_MESSAGE);		     
             } catch(e) {
                 yDebug.print("Exception in YBidManager.js::promptUserLogin()=>onload:" + e, YB_LOG_MESSAGE);
             }
		    },		
		    onerror: function (event) {
			    if(event.target.status == 403 || event.target.status == 401) {
				    //do silent logout				
				    yDebug.print("YBidManager.js::promptUserLogin()=> Received:" + event.target.status, YB_LOG_MESSAGE);				 
				    window.openDialog( "chrome://ybookmarks/content/reqUserCred.xul",
                                       "ReqUserCred",
                                       "chrome,dialog,centerscreen,modal,resizable=no" );
			    }
			    yDebug.print("YBidManager.js::promptUserLogin()=>Error", YB_LOG_MESSAGE);
		    }
		}
		if(tagCurTab) {
		    cb._tagCurrWindow = true;
		}
		ybookmarksUtils.socialStore.lastUpdate(cb);
      } else {
        window.openDialog( "chrome://ybookmarks/content/reqUserCred.xul",
                         "ReqUserCred",
                         "chrome,dialog,centerscreen,modal,resizable=no" );
      }      
  },

  acctSetupDlgShown: function() {
    var bundle = document.getElementById( "strbndl_idManager");
    //Customize the dialog label.
    var message = "extensions.ybookmarks.reqUserCred.message";
    if(window.arguments && window.arguments[0] && window.arguments[0].message) {
        message = window.arguments[0].message;
    }

    var serviceName = deliciousService.getServiceName();
    var str = bundle.getFormattedString( message, [ serviceName ] );
    ( document.getElementById( "desc_mainText" ) ).appendChild( document.createTextNode( str ) );
    str = bundle.getFormattedString( "extensions.ybookmarks.reqUserCred.dialog.title", 
                                     [ serviceName ] );
    document.title = str;
  },
  
  cancel: function() {
    window.close();
  },

  showAcctSetup: function() {
    window.close();
    ybookmarksUtils.openPreferences( "yb_account" );
  },
  
  showLoginPage: function() {    
    Components.classes["@mozilla.org/observer-service;1"].
               getService(Components.interfaces.nsIObserverService).
              notifyObservers(null, "ybookmark.showLoginWindow", "");
    window.close();
  },
  
  switchToClassicModeWarning: function(event) {
  	_userSelection = "cancel";		
  	window.openDialog( "chrome://ybookmarks/content/switchtoClassic.xul",
                       "Switch To Classic",
                       "chrome,dialog,centerscreen,modal,resizable=no");  
                       
    ////Disable the switch mode buttton.
    var pref = Components.classes["@mozilla.org/preferences-service;1"].
    	         getService(Components.interfaces.nsIPrefBranch);
    try {
	    var modeChange = pref.getCharPref("extensions.ybookmarks@yahoo.engine.set.mode");
	    if(modeChange == YB_EXTENSION_MODE_CLASSIC) {
		    var switchButton = document.getElementById("btn_classic_mode");
		    switchButton.disabled = true;
	    }
    } catch(e){}
    
    //Restart
    if(_userSelection == "restart") {
    	_userSelection = "cancel";
    	ybookmarksUtils._quit(true);		
    }
  },
  
  modeChangeToClassic : function() {
	//set the mode pref value.	
	var pref = Components.classes["@mozilla.org/preferences-service;1"].
	         getService(Components.interfaces.nsIPrefBranch);
	pref.setCharPref("extensions.ybookmarks@yahoo.engine.set.mode", YB_EXTENSION_MODE_CLASSIC);	 
  	//Keep/Remove bookmarks
    var radio = document.getElementById("ybLoggedOut-radio");
    var keepRadio = document.getElementById("ybLoggedOut-radio-keep");
    if (radio.selectedItem == keepRadio) {
    } else {	
    	YBidManager._cancelSync();
        YBidManager._socialStoreService.disallowImportPolling();
		YBidManager._removeUsersBookmarksStore();
    }
  	var restartCheck = document.getElementById("ybRestartNow");
	if(restartCheck.checked) {
		//Restart hack
		window.opener._userSelection = "restart";		
		//ybookmarksUtils._quit(true);
	}
	return true;
  },
  
  switchToStandardMode: function() {
    var params = {out:null};
    window.openDialog("chrome://ybookmarks/content/switchToRegMode.xul", "", "chrome,dialog,centerscreen,modal,resizable=no", params);
    if(params.out) {   	    	
    	//set the mode pref value and restart.
		var pref = Components.classes["@mozilla.org/preferences-service;1"].
		         getService(Components.interfaces.nsIPrefBranch);
		pref.setCharPref("extensions.ybookmarks@yahoo.engine.set.mode", YB_EXTENSION_MODE_STANDARD);        		
    	ybookmarksUtils.restartBrowser();
    }
    return true; 	    
  }
  
};

