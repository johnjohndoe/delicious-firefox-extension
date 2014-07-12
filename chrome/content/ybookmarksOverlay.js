// constants for cookie created by Delicious 2.0 XT
const DEL_COOKIE_NAME = 'FFDeliciousXT';
const DEL_COOKIE_URL = 'http://delicious.com/';
const DEL_COOKIE_DOMAIN = '.delicious.com';
const DEL_COOKIE_DATA = 'version=2.0';
const DEL_COOKIE_EXPIERE_AFTER_DAYS = 0; // create session cookie
const DEL_COOKIE_POST_REG = 'extReg';
const DEL_COOKIE_EXT_IMPORT = 'FFDeliciousXT_Import';

const Y_kSyncServiceContractID = "@mozilla.org/ybookmarks-sync-service;1";
const Y_kDelContractID = "@yahoo.com/socialstore/delicious;1";

/* Regular expression used to get the toolbar folder from the bookmarks file. */
const Y_TOOLBAR_FOLDER_RE = new RegExp(
   "^.*<H3[^<>]*PERSONAL_TOOLBAR_FOLDER=\"true\"[^<>]*>([^<]*)</H3>.*$", "m");
/* Wait to be performed between sync attempts. */
const Y_SYNC_ATTEMPT_WAIT = 10 * 1000;
const Y_BOOKMARKS_INITIAL_IMPORT_POLLING_PERIOD = 5 * 1000;
const Y_BOOKMARKS_IMPORT_POLLING_PERIOD = 30 * 1000;

// Default threshold to hide the MyTags menu popup in the main menu
const Y_DEFAULT_BOOKMARKS_THRESHOLD = 2000;

//Default maximum number of tags to show in delicious menu
const Y_DEFAULT_MAX_TAGS_SHOWN = 100;
const YB_MENUITEM_NOICON = "menuitem yb_menuitem_noicon";
var gPrefsWindow = null;

//number of seconds of idle to start storing favicons
const Y_IDLE_SERVICE_WAIT = 180; //wait for 3 minutes of idle time.

var ybookmarksMain = {
   initialized: false,
   gBookmarks: null,
   syncservice: null,
   strings: null,
   prefs: null,
   isNewTagAdded: false,
   isBookmarkChanged: true,
   isChangingDatasource : false,
   _is_frequent_menu_update_required: true,
   _is_recent_menu_update_required: true,
   _is_recently_saved_menu_update_required: true,
  
   _bookmarkRdfObserver: null,
   _isFirstTimeStart: null,
   
  
   onLoad: function() {
      yDebug.print("Loading ybookmarks");
      // remove the listener first
      window.removeEventListener( "load", yb_onLoad, false );
      
      /**
       * Hack for managing inconsistancy of bookmarks menu id ->> 2.* "bookmarks-menu" 3.* "bookmarksMenu"
       */
      var bookmarksMenuId = "";      
	  if(ybookmarksUtils.getFFMajorVersion() > 2) {
	  	bookmarksMenuId = "bookmarksMenu";	
	  } else {
	  	bookmarksMenuId = "bookmarks-menu";		  	
	  }
	  
      this.gBookmarks = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
					  getService(Components.interfaces.nsIYDelLocalStore);
      //register the sync service
      this.syncservice =
            Components.classes[Y_kSyncServiceContractID].
               getService(Components.interfaces.nsIYBookmarkSyncService);      
      // hide only if user requests
      this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefBranch);
                      
      var hideFFBMMenu = false;
      try {
        hideFFBMMenu = this.prefs.getBoolPref("extensions.ybookmarks@yahoo.original.ui.hide");
      } catch ( e ) { }
      // we put this here because there's some lag with the ui hiding, 
      // but we're safe to hide the bookmarks menu immediately
      var bookmarksMenu = document.getElementById(bookmarksMenuId);      
      if (bookmarksMenu) {
        if(!ybookmarksUtils.isOSXLeopard()) {
            bookmarksMenu.setAttribute('hidden', hideFFBMMenu);
        }
      }
      
      // initialization code
      this.initialized = true;
      this.strings = document.getElementById("ybookmarks-strings");
      /* register extension uninstall/disable observer. */
      yUninstallObserver.register();
      ybContextMenu.register();      
      ybUserInterface.register();      
      
      /* Only do these if we have a visible toolbar */ 
      if (window.toolbar.visible || window.menubar.visible || window.locationbar.visible) {        
        var del = Components.classes[Y_kDelContractID].getService( Components.interfaces.nsISocialStore );
        var username = del.getUserName();
        yDebug.print ( "User Name => " + username );
        if (username == null || username.length == 0) {
           yDebug.print ("No username found", YB_LOG_MESSAGE);
        } else {
           yDebug.print ("Username found", YB_LOG_MESSAGE);
        }
        yDebug.print ( "Login URL => " + del.login_url );
        yDebug.print ( "Register URL => " + del.register_url );
        yDebug.print ( "Service Name => " + del.service_name );

        var os = Components.classes["@mozilla.org/observer-service;1"]
                                     .getService(Components.interfaces.nsIObserverService);        
        os.addObserver( YbookmarkUpdateObserver, "ybookmark.syncBegin", false );
        os.addObserver( YbookmarkUpdateObserver, "ybookmark.syncInfo", false );
        os.addObserver( YbookmarkUpdateObserver, "ybookmark.syncDone", false );
        os.addObserver( YbookmarkUpdateObserver, "ybookmark.forceRefresh", false );

        //For intro-wizard, that too just coz of FF2.
        os.addObserver( YbookmarkUpdateObserver, "ybookmark.forceFFRestart", false );
        os.addObserver ( this._importBookmarksObserver, "ybookmark.importBookmarks", false);
        os.addObserver ( this._addBookmarkObserver, "ybookmark.addBookmark", false);
        os.addObserver ( this._loginWindowObserver, "ybookmark.showLoginWindow", false);
        os.addObserver ( yAddBookMark.bookmarkTransactionsObserver, "ybookmark.processTransactions", false);
        os.addObserver ( this._errorObserver, "ybookmark.serverError", false);
        os.addObserver( this._cookieObserver, "cookie-changed", false );

        yAddBookMark.addHooks();

        // 2007-01-24 cmyang: for some reason, we need to put this here. something with timing initializing the DOM key bindings.
        // currently, when we remap the keys, we need to open the bookmarks and del menu
        // which seems to reload the actual keybindings (opening a new window will work too).  Putting the call here probably makes
        // the changes prior to the initial DOM initialization        
        //var classic = false;
        //:::Classic

        var menu = window.document.getElementById("ybookmarks_menu_popup");
        var optionsMenu = window.document.getElementById("deliciousOptions");
        if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)  {	    
            ybUserInterface.tweakKeyBindings(false);	    	
            //:::Classic:::	              
            ybookmarksMain.showSpecialChildMenu(menu, "yb_classic_only");
            //Tools->Options menu	        
            if(optionsMenu) {
                optionsMenu.hidden = true;
            }
        } else {
            var remapKeyBindings = false;
            try {
              remapKeyBindings = this.prefs.getBoolPref("extensions.ybookmarks@yahoo.original.keybindings.remap");
            } catch (e) {}
            ybUserInterface.tweakKeyBindings(remapKeyBindings);	        
            //:::Classic:::Show all standard mode menu icons
            ybookmarksMain.showSpecialChildMenu(menu, "yb_std_mode_only");
            //Tools->Options menu	        
            if(optionsMenu) {
                optionsMenu.hidden = false;
            }
        }
        os.addObserver( YBidManager, "ybookmark.userChanged", false);        
        ybookmarksMain.setLoginState();
      } else { //This is for popup windows.
        ybUserInterface.setNoShortcutsForAll();
      }           
      //check for the first time start
      // allow the rest of fx to comeup before we attempt this
      setTimeout(function() {
                    try {
                       ybookmarksMain._delayedLoad();
                    } catch (e) {
                       yDebug.print("Uncaught error during _delayedLoad:"
                                    + e.message + (e.stack ? e.stack : ""),
                                    YB_LOG_MESSAGE);
                       throw e;
                    }
                 }, 250);
	
    //Show Delicious menu on Normal Mode.    
    if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_STANDARD)  {
	 this.checkUserLoggedInState();
        var ybMainDelMenu = document.getElementById("yb_menu");        
        if(ybMainDelMenu) {
            ybMainDelMenu.setAttribute('hidden', 'false');
        }
    }
    if(ybookmarksUtils.getFFMajorVersion() > 2) {
        /**
         * This hack is added to integrate delicious search with FF history 
         */
        try {
            if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_STANDARD) {
                ybookmarksMain.doFF3Extras();
                if(ybookmarksUtils.isAwesomebarIntegrationEnabled()) {            
                    var popup = document.createElement("panel");
                    var rlb = document.createElement("richlistbox");
                    rlb.setAttribute("id", "yb-awesome-bar-tag-suggest-richlistbox");
                    rlb.setAttribute("rows", "15");
                    rlb.setAttribute("onselect", "if(!this.firstSelectOver) { this.firstSelectOver = true; this.selectedIndex = -1; }");
                    popup.setAttribute("noautofocus", "true");
                    popup.setAttribute("hidden", "true");
                    popup.setAttribute("id", "yb-awesome-bar-tag-suggest");
                    popup.appendChild(rlb);
                    
                    window.setTimeout(function(popup) {
                                        var mainPopupSet = document.getElementById("mainPopupSet");
                                        if(!mainPopupSet) {
                                          return;
                                        }
                                        mainPopupSet.appendChild(popup);
                                        gURLBar.setAttribute('autocompletesearch', "delicious");
                                        try {
                                          gURLBar.setAttribute('maxrows', this.prefs.getIntPref('extensions.ybookmarks@yahoo.awesomebar.maxHistoryRows')
                                                             + this.prefs.getIntPref("extensions.ybookmarks@yahoo.awesomebar.maxRowsInDeliciousSearch"));
                                        } catch(e) {}
                                        ybAwesomeBarTagSuggest.attach(); }, 100, popup);
                    
                    yDebug.print("Attached delicious integration code to awesomebar", YB_LOG_MESSAGE);
                } else {
                    yDebug.print("Awesomebar integration is off, disabled via prefs.", YB_LOG_MESSAGE);
                }
            }
        } catch(e) { 
            yDebug.print("Error in integrating with awesomebar: "+e, YB_LOG_MESSAGE);
        }        
    }
    //Start store
    var delService = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
                getService(Components.interfaces.nsIYDelLocalStore);
    delService.init("ybookmarks.sqlite");	        
    yDebug.print("Done loading ybookmarks", YB_LOG_MESSAGE);      
    //End of onload
   },

  //TODO:Clean up this function.
  doFF3Extras: function() {
    try {
      //observe for idle service
      try {
        if(this.prefs.getBoolPref("extensions.ybookmarks@yahoo.updateFaviconsWhenIdle")) {
          var idleService = Components.classes["@mozilla.org/widget/idleservice;1"]
                       .getService(Components.interfaces.nsIIdleService)
          idleService.addIdleObserver(idleServiceObserver, Y_IDLE_SERVICE_WAIT);
        }
      } catch(e) {}

      //Listen for webpage loads
      gBrowser.addProgressListener(urlBarListenerFavIcon, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
    }
    catch(e) {
        yDebug.print("ybookmarksOverlay.js::doFF3Extras():: Exception - "+e, YB_LOG_MESSAGE);
    }	  
  },
   
  showSpecialChildMenu: function(menu, attribute) {
   for(i = 0; i < menu.childNodes.length; ++i ) {
       val = ( menu.childNodes[ i ] ).getAttribute( attribute );
       if( val && ( val == "true" ) ) {
         ( menu.childNodes[ i ] ).hidden = false;
       }
     }	
  },
   
   onUnload: function() { 
     ybContextMenu.unregister();
     try {
       this.prefs.removeObserver( "", YBonMenuTypePrefChanged );
     } catch ( e ) { }
     var os = Components.classes["@mozilla.org/observer-service;1"]
                                     .getService(Components.interfaces.nsIObserverService);
     try {
       os.removeObserver ( YbookmarkUpdateObserver, "ybookmark.syncBegin" );
       os.removeObserver ( YbookmarkUpdateObserver, "ybookmark.syncInfo" );
       os.removeObserver ( YbookmarkUpdateObserver, "ybookmark.syncDone" );
       os.removeObserver ( YbookmarkUpdateObserver, "ybookmark.forceRefresh");
       os.removeObserver ( YbookmarkUpdateObserver, "ybookmark.forceFFRestart");     

       os.removeObserver ( this._importBookmarksObserver, "ybookmark.importBookmarks");
       os.removeObserver ( this._addBookmarkObserver, "ybookmark.addBookmark");
       os.removeObserver ( this._loginWindowObserver, "ybookmark.showLoginWindow");
       os.removeObserver ( yAddBookMark.bookmarkTransactionsObserver, "ybookmark.processTransactions");
       os.removeObserver ( this._errorObserver, "ybookmark.serverError");
       os.removeObserver ( YBidManager, "ybookmark.userChanged");
       os.removeObserver( this._cookieObserver, "cookie-changed");
	  if(ybookmarksUtils.getFFMajorVersion() > 2) {
	      //Clear listen for webpage loads
    	  gBrowser.removeProgressListener(urlBarListenerFavIcon);
       
          //remove observe for idle service
          try {
            if(this.prefs.getBoolPref("extensions.ybookmarks@yahoo.updateFaviconsWhenIdle")) {
               var idleService = Components.classes["@mozilla.org/widget/idleservice;1"]
                                 .getService(Components.interfaces.nsIIdleService)
               idleService.removeIdleObserver(idleServiceObserver, Y_IDLE_SERVICE_WAIT);
            }
          } catch(e) {}
	  }
     }
     catch (e) { }
     try {
       yUninstallObserver.unregister();
     } catch ( e ) {
     }
     ybUserInterface.unregister();
   },
   
   postRegCookiePresent : function() {
   		var cookieManager = ( Components.classes[ "@mozilla.org/cookiemanager;1" ]
                                           .getService( Components.interfaces.nsICookieManager ) );
         var iter = cookieManager.enumerator; 
         while( iter.hasMoreElements() ) { 
            var cookie = iter.getNext(); 
            if( cookie instanceof Components.interfaces.nsICookie ) {
               	if(cookie.host == DEL_COOKIE_DOMAIN && cookie.name == DEL_COOKIE_POST_REG) {
                  yDebug.print( "ybookmarksOverlay.js:: postReg cookie found", YB_LOG_MESSAGE );
                  return true;
               	} 
            } 
         }
         return false;   	
   },
   
   hasAtleastOneToobarButton : function() {
    try {
        var toolbox = document.getElementById("navigator-toolbox");
        var toolboxDocument = toolbox.ownerDocument;
        
        for (var i = 0; i < toolbox.childNodes.length; ++i) {
            var toolbar = toolbox.childNodes[i];

            if (toolbar.localName == "toolbar"
                && toolbar.getAttribute("customizable")=="true") {
               if(toolbar.currentSet.indexOf("del-button-delicious") > -1)
                  return true;
               if(toolbar.currentSet.indexOf("del-button-tagPage")>-1)
                  return true;
               if(toolbar.currentSet.indexOf("del-button-delicious-page") > -1)
               	  return true;
            }
        }
        return false;
    } catch(e) {
        yDebug.print( "ybookmarksOverlay.js::hasAtleastOneToobarButton Exception:" + e, YB_LOG_MESSAGE );
    }  
   },
   
   addToolbarButtons : function() {
        var toolbox = document.getElementById("navigator-toolbox");
        var toolboxDocument = toolbox.ownerDocument;

        var hasDeliciousButton = false, hasTagPageButton = false, hasDeliciousPageButton = false;
        
        for (var i = 0; i < toolbox.childNodes.length; ++i) {
            var toolbar = toolbox.childNodes[i];

            if (toolbar.localName == "toolbar"
                && toolbar.getAttribute("customizable")=="true") {

               if(toolbar.currentSet.indexOf("del-button-delicious") > -1)
                  hasDeliciousButton = true;
               if(toolbar.currentSet.indexOf("del-button-tagPage")>-1)
                  hasTagPageButton = true;
               if(toolbar.currentSet.indexOf("del-button-delicious-page") > -1)
               	  hasDeliciousPageButton = true;
            }
        }    
        
        if(!hasDeliciousButton || !hasTagPageButton || !hasDeliciousPageButton) {
            var toolbar = document.getElementById("nav-bar");

            var newSet = "";
            var child = toolbar.firstChild;
            while(child){
                //Order of buttons is important
                if(!hasDeliciousPageButton && child.id == "urlbar-container") {
                	newSet += "del-button-delicious-page,";
                	hasDeliciousPageButton = true;
                }
                
                if(!hasDeliciousButton
                        && (child.id=="del-button-tagPage"
                        || child.id=="urlbar-container")) {
                    newSet += "del-button-delicious,";
                    //yDebug.print("ybookmarksOverlay.js::ybookmarksMain::addToolbarButtons()=> Adding delicious button", YB_LOG_MESSAGE);
                    hasDeliciousButton = true;
                }

                if(!hasTagPageButton && child.id=="urlbar-container") {
                    newSet += "del-button-tagPage,";
                    hasTagPageButton = true;
                }                  

                newSet += child.id+",";
                child = child.nextSibling;
            }

            newSet = newSet.substring(0, newSet.length-1);
            toolbar.currentSet = newSet;
            toolbar.setAttribute("currentset", newSet);
            toolboxDocument.persist(toolbar.id, "currentset");
            try {
                BrowserToolboxCustomizeDone(true);                    
            } catch (e) {
                /* protect against future change */
            }
        }           
   },
   
   firstTimeStart : function() {
   	yDebug.print("ybookmarksOverlay.js::ybookmarksMain::firstTimeStart()=> Invoked", YB_LOG_MESSAGE);
     try {
      var currentVersionNum = this.strings.getString("extensions.ybookmarks.versionNum");
      yDebug.print("ybookmarksOverlay.js::ybookmarksMain::firstTimeStart()=> Version being installed = "
      	+currentVersionNum, YB_LOG_MESSAGE);
      var newInstall        = false;
      var upgraded          = false;

      try{
      	//This will throw an exception for fresh install and in turn set the version number in prefs.
         var num = this.prefs.getCharPref("extensions.ybookmarks@yahoo.version.number");
                      
         if(num != currentVersionNum){
            this.prefs.setCharPref("extensions.ybookmarks@yahoo.version.number",
                                   currentVersionNum);
            yDebug.print("ybookmarksOverlay.js::ybookmarksMain::firstTimeStart()=> Install Type = Upgrade",
                          YB_LOG_MESSAGE);
            upgraded = true;                         
         }         
      } catch(e){
         this.prefs.setCharPref("extensions.ybookmarks@yahoo.version.number",
                                currentVersionNum);
         ybToolbar.firstTimeStart();
         newInstall = true;
         this._isFirstTimeStart = true;
		 yDebug.print("ybookmarksOverlay.js::ybookmarksMain::firstTimeStart()=> Install Type = New Install",
		 	YB_LOG_MESSAGE);
      }

      if(newInstall || upgraded) {
	 //Add the toolbar buttons forcefully on upgrade from version < 2.0.58.
         if(newInstall) {
            this.addToolbarButtons();
         }
        //Open tour url on upgrade.
         var postRegCookie = this.postRegCookiePresent();
         if(upgraded || (newInstall && !postRegCookie)) {
            setTimeout(function(aUrl) {
                       var browser = document.getElementById("content");
                       var tab = browser.addTab(aUrl);  
                       browser.selectedTab = tab;
                      }, 
                  100, 
                  deliciousService.getQuickTourUrl()
                   );
        }
      }      
  } catch (e) {
    yDebug.print("firstTimeStart(): " + e, YB_LOG_MESSAGE);
  }
  },   
  
   _delayedLoad: function() {
      yDebug.print("Delayed load start ybookmarks");
      
	  var pt = document.getElementById("PersonalToolbar"); // the old Bookmark Toolbar.  This is a check to see if we;re in the main overlay, and not some peon dialog
      if (pt) {
          var hideFFBMMenu = false;
          var remapKeyBindings = false;
          try {
            hideFFBMMenu = this.prefs.getBoolPref("extensions.ybookmarks@yahoo.original.ui.hide");
          } catch ( e ) { }         
          ybUserInterface.tweakBookmarksUI(hideFFBMMenu);          
      }
      
      var wm =
         Components.classes["@mozilla.org/appshell/window-mediator;1"].
            getService(Components.interfaces.nsIWindowMediator);
      var winEnumerator = wm.getEnumerator("navigator:browser");
      /* this guarantees that having multiple windows won't cause problems. */
      var isFirstWindow = (winEnumerator.getNext() == window);
      if (isFirstWindow) {
         // warn user to enable cookies.
         confirmEnableCookies();

         if (!this.isEngineInstalled()) {
            if (!this.installEngine()) {
                return;
            }
         }
      }
      
      // add the observer to change the status bar message during the update
      /* Only do these if we have visible toolbar */ 
      if (window.toolbar.visible || window.menubar.visible || window.locationbar.visible) {
        // Add observer for the preference
        this.prefs.addObserver( "", YBonMenuTypePrefChanged, false );
      }
      
      //Show sidebar on a mode change to classic
      try {
         var loadSidebar = this.prefs.getBoolPref("extensions.ybookmarks@yahoo.engine.revert.standard.mode");
         if(loadSidebar) {
         	toggleSidebar('viewYBookmarksSidebar', true);
         	this.prefs.setBoolPref("extensions.ybookmarks@yahoo.engine.revert.standard.mode", false);
         }      
      } catch(e) {}

      setTimeout(function() {
                    try {
                       ybookmarksMain._delayedLoad2();
                    } catch (e) {
                       yDebug.print("Uncaught error during _delayedLoad2:"
                                    + e.message,
                                    YB_LOG_MESSAGE);
                       throw e;
                    }
                 }, 1500);
    },
      
    /* begin the sync.  we delay this so that the localstore can be written out first */
    _delayedLoad2: function() {
      if (this.isEngineInstalled()) {
         var del = Components.classes[Y_kDelContractID].getService( Components.interfaces.nsISocialStore );
         var username  = del.getUserName();
         if (username) {
           this.syncservice.sync(true);        
         } else {
            //make sure private bookmarks are gone! if kept locally
            this.gBookmarks.deleteAllPrivateBookmarks();
            this.gBookmarks.setLastUpdateTime("-1");
            
         }
      }
      if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_STANDARD)  {
         this.checkUserLoggedInState();
      }
      yDebug.print("Delayed load done ybookmarks", YB_LOG_MESSAGE);
   },
       
   isBookmarkImportPolling: function() {
     if (!this.prefs.prefHasUserValue("extensions.ybookmarks@yahoo.import.polling")) {
       this.prefs.setBoolPref("extensions.ybookmarks@yahoo.import.polling", false);
     }
    return this.prefs.getBoolPref("extensions.ybookmarks@yahoo.import.polling");
     
   },
   
   setBookmarkImportPolling: function(polling) {
     this.prefs.setBoolPref("extensions.ybookmarks@yahoo.import.polling", polling);
    },
    
    _startImportAfterPolling: function(cookie) {
		var callback = {
        _ybookmarksMain: null,
        _cookie: null,
        
        onload: function(result) {
           yDebug.print("ybookmarksOverlay.js::_startImportAfterPolling=> Import status check onload", YB_LOG_MESSAGE);	
           var propertyBag = result.queryElementAt(0, Components.interfaces.nsIPropertyBag);
           var status = propertyBag.getProperty("status"); 
           var strings = document.getElementById("ybookmarks-strings"); 
           yDebug.print("ybookmarksOverlay.js::_startImportAfterPolling=> Import status is :" + status, YB_LOG_MESSAGE);
           //"complete", "importing" or "failed"
           if (status == "importing") {           	    
           	   //Show MessageBox. 
           	   var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
			           getService(Components.interfaces.nsIPromptService);
			    var title = strings.getString("extensions.ybookmarks.product.name");
			    var text = strings.getString("extensions.ybookmarks.import.already.running");
			    promptService.alert(this, title, text);
           } else {
               this._ybookmarksMain._importBookmarks(this._cookie);           	
           }
        },
        onerror: function(result) {
        	yDebug.print("ybookmarksOverlay.js::_startImportAfterPolling=> Import status check failed", YB_LOG_MESSAGE);
        }      
      };

      var ssr = Components.classes["@yahoo.com/socialstore/delicious;1"].
              getService(Components.interfaces.nsISocialStore);         
      callback._ybookmarksMain = this;
      callback._cookie = cookie;
      ssr.getImportStatus(callback); 	
    	
    },
    
   _checkBookmarkImportPolling: function() {
     var callback = {
        _ybookmarksMain: null,

        onload: function(result) {
           var propertyBag = result.queryElementAt(0, Components.interfaces.nsIPropertyBag);
           var status = propertyBag.getProperty("status");  
           //"complete", "importing" or "failed"
           if (status == "importing") {
                this._ybookmarksMain.setBookmarkImportPolling(true);
                 setTimeout(function() {    
                             var ssr = Components.classes["@yahoo.com/socialstore/delicious;1"].
                               getService(Components.interfaces.nsISocialStore);
                             ssr.getImportStatus(ybookmarksUtils.importStatusCallback); }, 
                           Y_BOOKMARKS_INITIAL_IMPORT_POLLING_PERIOD);
               }

        },
        onerror: function(event) {
        }      
      };

      var ssr = Components.classes["@yahoo.com/socialstore/delicious;1"].
              getService(Components.interfaces.nsISocialStore);         
      callback._ybookmarksMain = this;
      ssr.getImportStatus(callback);
   },
   /*
   * Adds delicious meu items in Bookmarks menu. Used in classic mode only.
   */
   addYbItemsToBookmarksMenu : function(popup) {
        var testMenu = document.getElementById("yb_bookmarks_test_menu");
        if(!testMenu) {   	
            var yb_str_bm_in_del = this.strings.getString("extensions.ybookmarks.menu.classic.add.bm");
            var yb_str_go_to_del = this.strings.getString("extensions.ybookmarks.menu.classic.goto.site");
            var yb_str_restore_normal = this.strings.getString("extensions.ybookmarks.menu.classic.restore.normal");
            
   	  	    //TODO: Move all strings to properties file.  	    
   	  	    var yb_bm_del_menu = document.createElement("menuitem");
   	  	    yb_bm_del_menu.setAttribute("id", "yb_bookmarks_test_menu");
   	  	    yb_bm_del_menu.setAttribute("label", yb_str_bm_in_del);
   	  	    yb_bm_del_menu.setAttribute("key", "addYBookmarkAsKb");
   	  	    yb_bm_del_menu.setAttribute("command", "cmd_yb_bookmark_this_page");   	  	    
   	  	    popup.insertBefore(yb_bm_del_menu, popup.firstChild);
   	  	  	  	
   	  	
   	  	    var yb_bm_site_del = document.createElement("menuitem");
   	  	    yb_bm_site_del.setAttribute("id", "yb_bm_site_del");
  	        yb_bm_site_del.setAttribute("label", yb_str_go_to_del);
  	        yb_bm_site_del.setAttribute("key", "key_myDelicious");
  	        yb_bm_site_del.setAttribute("command", "cmd_yb_jump_my_del");
       	  	
   	  	    var yb_bm_restore_std = document.createElement("menuitem");
   	  	    yb_bm_restore_std.setAttribute("id", "yb_bm_restore_std");
   	  	    yb_bm_restore_std.setAttribute("class", "menuitem-iconic provider-menubar-icon bookmark-item");
   	  	    yb_bm_restore_std.setAttribute("image", "chrome://ybookmarks/skin/deliciousSingleButton.png");
  	        yb_bm_restore_std.setAttribute("label", yb_str_restore_normal);
   	  	    yb_bm_restore_std.setAttribute("command", "cmd_yb_switch_regular");       	  	
       	  	
   	  	    var tempNode = popup.firstChild;        
   	  	    //Only for FF2, trick to find separator after Organizer
   	  	    var foundOrganizer = false;
   	  	    while(tempNode) {   	  	        
   	  	        if(ybookmarksUtils.getFFMajorVersion() > 2) {
   	  	            if(tempNode.id == "bookmarksShowAll") {
   	  	                popup.insertBefore(yb_bm_site_del, tempNode);   	  	            
   	  	            }
   	  	            if(tempNode.id == "organizeBookmarksSeparator") {
   	  	                popup.insertBefore(yb_bm_restore_std, tempNode);
   	  	                break;
   	  	            }
   	  	        } else {// Handle Firefox 2
   	  	            if(tempNode.getAttribute("key") == "manBookmarkKb") {
   	  	                popup.insertBefore(yb_bm_site_del, tempNode);
   	  	                foundOrganizer = true;
   	  	            }   	  	            
   	  	            if(foundOrganizer && (tempNode.nodeName == "menuseparator")) {
   	  	                foundOrganizer = false;
   	  	                popup.insertBefore(yb_bm_restore_std, tempNode);
   	  	                break;
   	  	            }
   	  	        }
   	  	        tempNode = tempNode.nextSibling;
   	  	    }
   	  	}
   },
   
   onBookmarksMenuPopupShowing: function(event) {
   	  if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)  {
   	  	var popup = event.target;
   	  	this.addYbItemsToBookmarksMenu(popup);   	  	
   	  	return true; 
   	  }
   	  
      var popup = event.target;
      var hideThisMenu = document.getElementById("yb_bookmarks_menu_hide_this_menu");
      var sep;
    
      if (hideThisMenu && hideThisMenu.parentNode == popup) {
         sep = document.getElementById("yb_bookmarks_menu_hide_this_menu_sep");
         popup.removeChild(sep);
         popup.removeChild(hideThisMenu);
       }

       hideThisMenu = document.createElement("menuitem");
       hideThisMenu.setAttribute("observes", "yb-broadcaster-bookmarksmenu-hide-this");
       hideThisMenu.setAttribute("id", "yb_bookmarks_menu_hide_this_menu");
       sep = document.createElement("menuseparator");
       sep.setAttribute("id", "yb_bookmarks_menu_hide_this_menu_sep");
    
       popup.appendChild(sep);
       popup.appendChild(hideThisMenu);
    
   },
    
   bookmarkThisTab: function() {
    var tab = getBrowser().mContextTab;
    if (tab.localName != "tab")
        tab = getBrowser().mCurrentTab;
    yAddBookMark.addBookmarkForTabBrowser(tab.linkedBrowser);
   },
   
   _exciseMenuDestructive: function(parent, start, end) {
     var start_i = -1;
     for(var i=0; i < parent.childNodes.length; i++) {
         if (parent.childNodes[i] == start) { 
           start_i = i;
           break; 
         } 
     }
     if (start_i >= 0) {
       var child = parent.childNodes[start_i+1]; // for some reason, a for loop doesn't work... early binding?
       while (child != end) { 
          parent.removeChild (child);
          child = parent.childNodes[start_i+1];
       }

     }

   },
   
   addTagsToolbarToMenu: function(event) {
     
     try { 	
        //Hide switchButton on pending mode switch.      
       if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)  {
	      var pref = Components.classes["@mozilla.org/preferences-service;1"].
		         getService(Components.interfaces.nsIPrefBranch);		
		  var modeChange = pref.getCharPref("extensions.ybookmarks@yahoo.engine.set.mode");		  
		  if(modeChange == YB_EXTENSION_MODE_STANDARD) {	  				  	
		  	var switchButton = document.getElementById("ybookmarks_switch_to_std_mode");
		  	switchButton.hidden = true;
		  }				  
       } 	
       if (event.target.id != "ybookmarks_menu_popup" || ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC) {
          return; 
       }
       var myTagsMenu = document.getElementById( "ybookmarks_tags_menu" );
       if ( myTagsMenu ) {
        /* var threshold = Y_DEFAULT_BOOKMARKS_THRESHOLD;
         try {
           threshold = this.prefs.getIntPref( "extensions.ybookmarks@yahoo.bookmark.threshold" );
         } catch ( e ) {
         }
         
         if ( this._cachedTotalBookmarks > threshold || (this._cachedTotalBookmarks = this.gBookmarks.getTotalBookmarks()) > threshold ) {
           myTagsMenu.hidden = true;
         } else {
           myTagsMenu.hidden = false;
         }*/
         
         try {
           myTagsMenu.hidden = this.prefs.getBoolPref("extensions.ybookmarks@yahoo.deliciousmenu.hidetagsmenu");
         } catch (e) {
           yDebug.print("error with gettting preference: extensions.ybookmarks@yahoo.deliciousmenu.showtagsmenu: " + e);
         }
       }
              
       var popup = event.target;
       var start = document.getElementById("ybookmarks_tags_toolbar_start");
       var stop = document.getElementById("ybookmarks_tags_toolbar_stop");
       this._exciseMenuDestructive(popup, start, stop);
      
       var tags = ybBags.getFavoriteTags();
       
       for (var i=0; i < tags.length; i++) {
        var tagArg =  {name: tags[i],
                       url: "",
                       icon: "",
                       type: YB_TYPE_TAG,
                       order: ybBags.getFavoriteTagOrder(tags[i]),
                       menubar: true,
                       favoriteTag: true};
        var menuItem = ybBookmarksMenu.createMenuItem(tagArg);
        popup.insertBefore(menuItem, stop);
        
       }
      } catch (e) { 
      yDebug.print("addTagsToolbarToMenu(): " + e, YB_LOG_MESSAGE);
     }
   },

   onBundlesPopupShowing: function (event) {
     var popup = event.target;
     var end = document.getElementById("ybookmarks_bundles_menubar_popup_end");
     
     while(popup.childNodes[0] != end) {
       popup.removeChild(popup.childNodes[0]);
     }
     
     var bundles = this.gBookmarks.getBundles({});
     for (var i=0; i < bundles.length; i++) {
       var b = bundles[i];
       var bArg = { name: b.name,
                    type: YB_TYPE_BUNDLE};
       var menuItem = ybBookmarksMenu.createMenuItem(bArg);
       
       popup.insertBefore(menuItem, end); 
     }
     
   },
      
   /* kludge: as it seems, RSS feeds tend to be in reverse-chrono order.  The problem
      is that the datasource adds these livemakrs in order, so the newest has the oldest adddate.
      So: ascending add date -> descending actual date */
   reverseLivemarkMenu: function(menu) {
     if (!menu.getAttribute("reversed")) {
       var copy = new Array(menu.childNodes.length);
       var i = 0;
       while (menu.childNodes.length) {
         copy[i] = menu.removeChild(menu.firstChild);
         i++;
       }
       for (i=copy.length-1; i >=0 ; i--) {
         menu.appendChild(copy[i]);
       }
       menu.setAttribute("reversed", true);
     }
   },
   
   _getLivemarkAddDate: function (aLivemark) {
      var bm = this.gBookmarks.getBookmark(aLivemark.getAttribute("url"));
      bm.QueryInterface(Components.interfaces.nsIYBookmark)
      return bm.added_date;
   },
   
   sortLivemarkMenu: function(menu, aOrder) {
     //if (!menu.getAttribute("reversed")) {
       try {
       var copy = [];
       var i = 0;
       while (menu.childNodes.length) {
         var item = menu.removeChild(menu.firstChild);
         if (item.getAttribute("url")) {
           copy.push(item);
         }
       }
       var func = null;
       // remember that livemark items are processed in order of the xml file
       // so most recent items actually have an earlier add date
       if (aOrder == FAVTAGS_ORDER_CHRONO) { 
         func = function(a, b) { return ybookmarksMain._getLivemarkAddDate(b) - ybookmarksMain._getLivemarkAddDate(a) };
       } else if (aOrder == FAVTAGS_ORDER_CHRONO_REVERSE) {
         func = function(a, b) { return ybookmarksMain._getLivemarkAddDate(a) - ybookmarksMain._getLivemarkAddDate(b) };      
       } else if (aOrder == FAVTAGS_ORDER_ALPHANUM) {
          func = function(a, b) { return a.getAttribute("label").localeCompare(b.getAttribute("label")); };      
       } else if (aOrder == FAVTAGS_ORDER_ALPHANUM_REVERSE) {
          func = function(a, b) { return b.getAttribute("label").localeCompare(a.getAttribute("label")); };      
       } else if (aOrder == FAVTAGS_ORDER_USER) {
          func = null;
       }
     
       if (func) {
         copy.sort(func); 
       }
       
       for (var i=0; i < copy.length ; i++) {
         menu.appendChild(copy[i]);
       }
       //menu.setAttribute("reversed", true);
     //}
   } catch (e) {yDebug.print(e);}
   },
   
   loadRelevantPage : function(event, aStr, aMouseClick){
      var del = Components.classes[Y_kDelContractID]
                 .getService( Components.interfaces.nsISocialStore );
      
      var user = del.getUserName();
      var url = null;
      switch(aStr){
      case "login":
       if(!user)
            url = del.login_url;
         else
            url = deliciousService.getUrl("logout");
         break;
      case "logout":
         url = deliciousService.getUrl("logout");
         break;
      case "moreabout":
         if(!user)
            url = del.login_url;
         else
            url = deliciousService.getMoreAboutUrl(content.location);
         break;
      case "your":
         if(!user)
            url = del.login_url;
         else
            url = deliciousService.getUrl(user);
         break;
      case "network":
         if(!user)
            url = del.login_url;
         else
            url = deliciousService.getUrl("network/" + user);
         break;
      case "tags":
         if(!user)
            url = del.login_url;
         else
            url = deliciousService.getUrl("tags/" + user);
         break;
      case "subscriptions":
         if(!user)
            url = del.login_url;
         else
            url = deliciousService.getUrl("subscriptions/" + user);
         break;
      case "inbox":
      case "for":
         if(!user)
            url = del.login_url;
         else
            url = deliciousService.getUrl("for/" + user);
         break;
      case "settings":
         if(!user)
            url = del.login_url;
         else
            url = deliciousService.getUrl("settings/" +
                user + "/profile");
         break;     
      case "homepage":
         url = deliciousService.getUrl("");
         break;
      case "popular":
         url = deliciousService.getUrl("popular/");  
         break;
      case "recent":
         url = deliciousService.getUrl("recent/");
         break;
      case "about":
         url = deliciousService.getUrl("about");
         break;
      case "help":
         url = deliciousService.getUrl("help/");
         break;
      case "tour":
         var strings = document.getElementById("ybookmarks-strings");
         url = deliciousService.getQuickTourUrl();
         break;
      case "bundles":
         url = deliciousService.getBundleUrl();
         break;
      case "editbundle":
        url = deliciousService.getEditBundleUrl(event.bundle);
        break;
      default:
         url = deliciousService.getUrl();
         break;
      }
      
      if (url) {
         this.UIloadPage(event, url, aMouseClick);
      }
   },

   UIloadPage : function(event, aUrl, aMouseClick){
   
     var browser = document.getElementById("content");
     if(aMouseClick){
       if(event.button == 1){
         if(event.target.localName == "menuitem") {
           var menu = event.target.parentNode;
           while( menu.localName == "menu" || menu.localName == "menupopup" ) {
             if( menu.localName == "menupopup" ) {
               menu.hidePopup();
             }
             menu = menu.parentNode;
           }
         }
         var tab = browser.addTab(aUrl);  
         browser.selectedTab = tab;
       }
     }
      else{
        if(!event){
          browser.loadURI(aUrl);
        
        return;
        }
        
        var shift = event.shiftKey;     
        var ctrl =  event.ctrlKey;                
        if (ctrl) {    
          var tab = browser.addTab(aUrl);  
          browser.selectedTab = tab;
        }
        else if(shift){
          openDialog("chrome://browser/content/browser.xul", "_blank", "chrome,all,dialog=no", aUrl);
        }
        else
          browser.loadURI(aUrl);
      }  
   
   return;
   },
	/* check for validity of user's cookie once on startup */
	checkUserLoggedInState:function(){
		var del = Components.classes[Y_kDelContractID].getService( Components.interfaces.nsISocialStore );
		var cb = {
                  onload: function (event) {
                   yDebug.print("ybookmarksOverlay.js::checkUserLoggedInState()=>Onload", YB_LOG_MESSAGE);			
                   //do silent logout	for testing			
                   try {
/*
                	   try {	
	                       var sLogout = ybookmarksMain.prefs.getBoolPref("extensions.ybookmarks@yahoo.test.silentlogout");
	                       if(sLogout) {
	                           yDebug.print("ybookmarksOverlay.js::checkUserLoggedInState()=> fake 401 for testing.", YB_LOG_MESSAGE);
	                               Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService)
	                                .notifyObservers(null, "ybookmark.userChanged", "triggerSilentLogout");
	                       }
					   } catch(e){}
*/					   
                       var isSilentLogout = ybookmarksMain.prefs.getBoolPref("extensions.ybookmarks@yahoo.delicious.silentlogout");
                       if(isSilentLogout) {
                          ybookmarksMain.prefs.setBoolPref("extensions.ybookmarks@yahoo.delicious.silentlogout", false);
                          var os = Components.classes["@mozilla.org/observer-service;1"]
                                   .getService(Components.interfaces.nsIObserverService);                  
                          os.notifyObservers(null, "ybookmark.userChanged", "loggedin");
                          yDebug.print("ybookmarksOverlay.js::checkUserLoggedInState()=>Cleared silent logout", YB_LOG_MESSAGE);
                       }
                    } catch(e) {
                        yDebug.print("Exception in checkUserLoggedInState()=>onload:" + e, YB_LOG_MESSAGE);
                    }
                  },		
                  onerror: function (event) {
                          if(event.target.status == 403 || event.target.status == 401) {
                                  //do silent logout				
                                 yDebug.print("ybookmarksOverlay.js::checkUserLoggedInState()=> Received 401 or 403 response from the server", YB_LOG_MESSAGE);
                                 Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService)
                                   .notifyObservers(null, "ybookmark.userChanged", "triggerSilentLogout");
                                 yDebug.print("ybookmarksOverlay.js::checkUserLoggedInState()=>Error", YB_LOG_MESSAGE);
                          }
                  }
		}
		del.lastUpdate(cb);
	},
	
   isEngineInstalled : function(){           
      var installed = false;
      var newVersionNum = this.strings.getString("extensions.ybookmarks.versionNum");
      try {
      	var oldVersionNum = this.prefs.getCharPref("extensions.ybookmarks@yahoo.version.number");
        var wasDisabled = this.prefs.getBoolPref("extensions.ybookmarks@yahoo.extension.disabled.confirmed");        
        if(wasDisabled) {
            yDebug.print("ybookmarksOverlay.js::isEngineInstalled - (previous version was disabled).", YB_LOG_MESSAGE);  
            this.prefs.setBoolPref("extensions.ybookmarks@yahoo.extension.disabled.confirmed", false);
            if(!this.hasAtleastOneToobarButton()) {
                this.addToolbarButtons();
                yDebug.print("ybookmarksOverlay.js::isEngineInstalled - Added toolbar buttons (previous version was disabled).", YB_LOG_MESSAGE);  
            }
        }      
      }catch (e){
      	yDebug.print("ybookmarksOverlay.js::ybookmarksMain::isEngineInstalled()=>Engine not installed",
      		YB_LOG_MESSAGE);
      }               
      if(newVersionNum == oldVersionNum){        
  		installed = true;
      	yDebug.print("ybookmarksOverlay.js::ybookmarksMain::isEngineInstalled()=>Engine installed",
      		YB_LOG_MESSAGE);
   	    
   	  }
   	  return installed;   	  
   },
   

   installEngine : function() {
     yDebug.print("ybookmarksOverlay.js::ybookmarksMain::installEngine()=> Installing Engine...",YB_LOG_MESSAGE);          
      this.firstTimeStart();
    //Find if first install, and open sidebar depending upon the mode  
    if(this._isFirstTimeStart) {
        var modeSelected = null;
        try {
            var pref = Components.classes["@mozilla.org/preferences-service;1"].
				             getService(Components.interfaces.nsIPrefBranch);
            modeSelected = pref.getCharPref("extensions.ybookmarks@yahoo.engine.set.mode");
        } catch(e){}
        if(modeSelected != YB_EXTENSION_MODE_CLASSIC) {
            setTimeout(function() { toggleSidebar('viewYBookmarksSidebar', true); }, 100);
        }
    }
	return true;
   },  

   onTagsMenuPopupShowing: function(event) {
     try {
         var popup = event.target;
         while(popup.childNodes.length) {
           popup.removeChild(popup.lastChild);
         }
         var tags = [];
         var freqMode = ybookmarksMain.gBookmarks.getTotalTags() > Y_DEFAULT_MAX_TAGS_SHOWN ?  true : false;
         if(freqMode) {
            tags = ybookmarksMain.gBookmarks.getAllTags(null, "frequency", {});                        
         } else {
            tags = ybookmarksMain.gBookmarks.getAllTags(null, "name", {});
         }
         var maxCount = freqMode ? Y_DEFAULT_MAX_TAGS_SHOWN : tags.length;
         var menuArray = [];
         for (var i=0; i < maxCount; i++) {
           var tag = tags.queryElementAt(i, Components.interfaces.nsIWritablePropertyBag);
           var tagArg = { name: tag.getProperty("name"),
                          type: YB_TYPE_TAG,
                          menubar: true,
                          order: FAVTAGS_ORDER_ALPHANUM };           
           if(freqMode) {
               menuArray.push(tagArg);
           } else {
               var item = ybBookmarksMenu.createMenuItem(tagArg);
               popup.appendChild(item);                
           }
         }
         if(freqMode) {
             var func = function(a, b) { return a.name.localeCompare(b.name); };
             menuArray.sort(func);
             var len = menuArray.length;
             for (var i =0; i < len; ++i) {
               var item = ybBookmarksMenu.createMenuItem(menuArray[i]);
               popup.appendChild(item); 
             }
         }
     } catch (e) {
      yDebug.print("onTagsMenuPopupShowing(): " + e);
     }
     
   },
  
   onFrequentMenuPopupShowing: function(event) {
     var total = ybookmarks_Main.addBookmarksToPopup(event.target, 'visit_vount');
   },

   onRecentlySavedMenuPopupShowing: function(event) {
      var total = ybookmarks_Main.addBookmarksToPopup(event.target, 'last_added');
   },
   
   openImportProgress: function (data) {
         window.openDialog("chrome://ybookmarks/content/importProgress.xul", "yb-import-progress", "centerscreen", data);
   },
   
   _importBookmarksObserver: {
     
     observe: function(subject, topic, data) {
     
       try {           
         if (topic == "ybookmark.importBookmarks") {
           yDebug.print("ybookmarksOverlay.js::_importBookmarksObserver()=> Inside import observer....",
           		YB_LOG_MESSAGE);

           var pgrText = document.getElementById("ybookmark-import-progresstext" );
           var pgrMeter = document.getElementById("ybookmark-import-progressmeter" );
           var pgrStatus = document.getElementById("ybookmark-import-progress-statusbarpanel" );
           var strings = document.getElementById( "ybookmarks-strings" );
           
           subject.QueryInterface(Components.interfaces.nsISupportsString);
     
           /* display the import progress on statusbar */
           if (subject.data == "startImport") {
             pgrStatus.collapsed = false;
             pgrText.collapsed = false;
			 /* progressmeter in mode=undetermined was causing some CPU usage even in collapsed state.
			 	So we switch back to determined mode along with collapsing the element.			     
             */
             pgrMeter.collapsed = false; pgrMeter.mode="undetermined";
             pgrText.value = strings.getString( "extensions.ybookmarks.statusbar.importing" );
           }
           else if (subject.data == "importProgress") {
           
             switch (data) {
               
               case "complete":
                 pgrMeter.collapsed = true; pgrMeter.mode="determined";
                 pgrStatus.collapsed = false;
     pgrText.collapsed = false;
                 pgrText.value = strings.getString( "extensions.ybookmarks.statusbar.importdone" );
                 setTimeout(function(){  
                     //only hide this if "importing successfully" text is showing
                     if (pgrText.value == strings.getString( "extensions.ybookmarks.statusbar.importdone" )) {
                       pgrStatus.collapsed = true;
                       pgrText.collapsed = true;
                       pgrMeter.collapsed = true; pgrMeter.mode="determined";
                     }
                   }, 30000);
               break;
               case "importing":
                 pgrStatus.collapsed = false;
                 pgrText.collapsed = false;
                 pgrMeter.collapsed = false; pgrMeter.mode="undetermined";
                 pgrText.value = strings.getString( "extensions.ybookmarks.statusbar.importing" )
               break;
               case "failed":
                 pgrMeter.collapsed = true; pgrMeter.mode="determined";               
                 pgrText.value = strings.getString( "extensions.ybookmarks.statusbar.importfailed" );
               break;
             }
           }
           else if (subject.data == "importError") {
             pgrMeter.collapsed = true; pgrMeter.mode="determined";           
             pgrText.value = strings.getString( "extensions.ybookmarks.statusbar.importfailed" );
           }
           

           /* this guarantees that having multiple windows won't cause problems. */
           var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
                 getService(Components.interfaces.nsIWindowMediator);
           var recentWindow = wm.getMostRecentWindow("navigator:browser");
           if (recentWindow != window) {
             return;
           }

           if (subject.data == "startImport") {
           	 if(!ybookmarksUtils.isRecentWindow()) { //To make sure that import is initiated by recent window alone
           	 	return;
           	 }
             try {
               var dataString = new String(data);
               var args = YBJSON.parse(dataString);

               var addTags = args.addTags;
               var addPopularTags = args.addPopularTags;
               var replaceDuplicates = args.replaceDuplicates; 
               var email = args.email;
               var priv = args.priv;

               if (args.filePath != null) { // check for null, not "".  "" means Firefox's bookmarks.html                 
                 setTimeout ( function() { ybookmarksUtils.startImport(addTags, addPopularTags, replaceDuplicates, args.filePath, email, priv); }, 0);
               } else if (args.bookmarksString){                 
                 setTimeout ( function() { ybookmarksUtils.startImportWithBookmarksString(addTags, addPopularTags, replaceDuplicates, args.bookmarksString, email, priv); }, 0);
               }
             } catch (e) { 
              yDebug.print(e, YB_LOG_MESSAGE);
             }
                
           } else if (subject.data == "importProgress") {  
             //complete", "importing" or "failed    
             if (data == "complete" || data == "failed") {
               if (data == "complete" && ybookmarksMain.isEngineInstalled() && ybookmarksUtils.isRecentWindow()) {
                 ybookmarksMain.syncservice.sync(false);
               }
                  
               if (ybookmarksMain.isBookmarkImportPolling()) {
                 ybookmarksMain.openImportProgress(data);
                 ybookmarksMain.setBookmarkImportPolling(false);
               }   
             } else {
               setTimeout(function() {
                    var ssr = 
                        Components.classes["@yahoo.com/socialstore/delicious;1"].
                           getService(Components.interfaces.nsISocialStore);    
                    ssr.getImportStatus(ybookmarksUtils.importStatusCallback); }, 
                    Y_BOOKMARKS_IMPORT_POLLING_PERIOD);
              } 
            } else if (subject.data == "importError") {
              ybookmarksMain.openImportProgress("failed");
              ybookmarksMain.setBookmarkImportPolling(false);
            }
          }
          
       } catch (e) { 
         yDebug.print("importBookmarksObserver: " + e, YB_LOG_MESSAGE);
       }
     }      
   },
   
   importBookmarks: function() {
     
     if(!YBidManager.isUserLoggedIn()) {
       YBidManager.promptUserLogin();
	   return;
     }  

     var callback = {
       _ybookmarksMain: null,
       
       onload: function(result) {
          var propertyBag = result.queryElementAt(0, Components.interfaces.nsIPropertyBag);
          var status = propertyBag.getProperty("status");  
          //"complete", "importing" or "failed"
          if (status == "importing") {
              ybookmarksMain.openImportProgress("importing");  
              if (!this._ybookmarksMain.isBookmarkImportPolling()) {
                this._ybookmarksMain.setBookmarkImportPolling(true);      
                setTimeout(function() {    
                            var ssr = Components.classes["@yahoo.com/socialstore/delicious;1"].
                              getService(Components.interfaces.nsISocialStore);
                            ssr.getImportStatus(ybookmarksUtils.importStatusCallback); }, 
                          Y_BOOKMARKS_IMPORT_POLLING_PERIOD);
              }
          
          } else {
            this._ybookmarksMain.setBookmarkImportPolling(false);      
            window.openDialog("chrome://ybookmarks/content/importBookmarks.xul", "yb-import-bookmarks", 
                                "chrome,centerscreen");
          }
       },
       onerror: function(event) {
       }      
     };

     var ssr = Components.classes["@yahoo.com/socialstore/delicious;1"].
             getService(Components.interfaces.nsISocialStore);         
     callback._ybookmarksMain = this;
     ssr.getImportStatus(callback);     
   },
   //Gives status bar notifications plus login prompt.
   fullSyncFailMessage: function() {
     var obsService = Components.classes["@mozilla.org/observer-service;1"]
                      .getService(Components.interfaces.nsIObserverService);				
     obsService.notifyObservers(null, "ybookmark.syncBegin", "no-update");
	 obsService.notifyObservers(null, "ybookmark.syncDone", "sync-aborted");     
	 var rv = {  message : "extensions.ybookmarks.reqUserCred.FullSync.message" };
	 window.openDialog( "chrome://ybookmarks/content/reqUserCred.xul",
                     "ReqUserCred",
                     "chrome,dialog,centerscreen,modal,resizable=no", rv ); 
   },

   forceRefresh: function() {     
       var socialStore = Components.classes[Y_kDelContractID]
                            .getService( Components.interfaces.nsISocialStore );
       if(!socialStore.getUserName()) {         
         ybookmarksMain.fullSyncFailMessage();
         return;
       } 
       try {
            var silentMode = Components.classes["@mozilla.org/preferences-service;1"]
                         .getService(Components.interfaces.nsIPrefBranch)
                         .getBoolPref("extensions.ybookmarks@yahoo.delicious.silentlogout");         
       } catch(e){}
       //TODO: Implement better solution to workaround sync failure.
       var del = Components.classes[Y_kDelContractID].getService( Components.interfaces.nsISocialStore );
       var cb = {
            _onSilentLogout : null,
			onload: function (event) {
				 yDebug.print("ybookmarksOverlay.js::forceRefresh()=>Onload");
				 try {
				     if(ybookmarksMain.syncservice.isSyncing()) {
				        yDebug.print("ybookmarksOverlay.js::forceRefresh()=>Onload, sync in progress, cancelling force-refresh", YB_LOG_MESSAGE);
                        return;        
                     }
                     ybookmarksMain.gBookmarks.clearLocalStore("silent-logout");
				     ybToolbar.refreshCurrentView();
				     ybookmarksMain.syncservice.sync(false);
                 } catch(e) {
                    yDebug.print("ybookmarksOverlay.js::forceRefresh()=>Onload exception:" + e, YB_LOG_MESSAGE);
                 }				 
			},		
			onerror: function (event) {
				yDebug.print("ybookmarksOverlay.js::forceRefresh()=>OnError", YB_LOG_MESSAGE);
				if((silentMode) && event.target && (event.target.status == 403 || event.target.status == 401)) {
				    this._onSilentLogout();
				    return;
				}
				var obsService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
				obsService.notifyObservers(null, "ybookmark.syncBegin", "no-update");
				obsService.notifyObservers(null, "ybookmark.syncDone", "sync-aborted");
			}
       }
       cb._onSilentLogout = ybookmarksMain.fullSyncFailMessage; 
       del.lastUpdate(cb);
   },

   /**
    * Set the UI based on the login state 
    */   
   setLoginState : function() {
      
      var socialStore = Components.classes[Y_kDelContractID]
                 .getService( Components.interfaces.nsISocialStore );

      var username = socialStore.getUserName();
      if (username) {
        YBidManager.setLastUsername(username);
        this.setLoggedInState (username)
      }
      else {
        this.setLoggedOutState();
      }
   },
   
   setLoggedInState : function(username) {

     var loggedInElement =  document.getElementById("ybookmarks_loggedin_menu");
     var loginElement =  document.getElementById("ybookmarks_login_menuitem");
     var pgrStatus = document.getElementById("ybookmark-import-progress-statusbarpanel" );
   
     if (loggedInElement) {
       if (this.strings) {
         loggedInElement.setAttribute("label", this.strings.getFormattedString("ybookmarks.loggedInAs", [username]));
       }
       loggedInElement.hidden = false;
     }
     if (loginElement) {
       loginElement.hidden = true;
     }
     if (pgrStatus) {
       pgrStatus.hidden = false;
     }
   },
   
   setLoggedOutState : function() {
     var loggedInElement =  document.getElementById("ybookmarks_loggedin_menu");
     var loginElement =  document.getElementById("ybookmarks_login_menuitem");
     var pgrStatus = document.getElementById("ybookmark-import-progress-statusbarpanel" );
     
     loggedInElement.hidden = true;
     loginElement.hidden = false;
     if (pgrStatus) {
       pgrStatus.hidden = true;
     }
   },

   delMenuShowing: function( menu ) {
      var i, val;
      var debugMode = yDebug.on( true );
      for(i = 0; i < menu.childNodes.length; ++i ) {
         val = ( menu.childNodes[ i ] ).getAttribute( "yb_debugModeOnly" );
         if( val && ( val == "true" ) ) {
            ( menu.childNodes[ i ] ).hidden = !debugMode;
         }
      }
   },
   
   _addBookmarkObserver: {
       observe: function(subject, topic, data) {
         if (topic == "ybookmark.addBookmark") {
         	if(data == "emptybookmark") {
            	setTimeout( function() {yAddBookMark.open( "", "", null, null, null, null, true );} , 650);
         	} else if(data == "currentWindow") {
         	    setTimeout( function() {yAddBookMark.open();} , 650);
         	} else if(data) {
         	    setTimeout( function() {yAddBookMark.open(data);} , 650);
         	}
         }
       }
    },
    
    _loginWindowObserver: {
       observe: function(subject, topic, data) {
         if (topic == "ybookmark.showLoginWindow") {
            if (window == ybookmarksUtils.getTopWindow()) {
                yDebug.print("Going to display Login window", YB_LOG_MESSAGE);
                setTimeout(function() {YBPopupWindow.showLoginWindow();}, 100);
            }
         }
       }
    },
   
   _errorObserver: {
     observe: function(subject, topic, data) {
       
       var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
                        getService(Components.interfaces.nsIWindowMediator);
       var recentWindow = wm.getMostRecentWindow("navigator:browser");
       if (recentWindow == window) {
        if (topic == "ybookmark.serverError") {
           var dataObject = YBJSON.parse(data);
           window.openDialog(
             "chrome://ybookmarks/content/serverError.xul", 
             "server-error-dialog",
             "chrome,dialog,centerscreen,modal,resizable=no",
             dataObject);
         }
       }
       
     }
   },
   
   // initiates an import based on import cookie
   _importBookmarks : function(importCookie){
	
	try {
	var decodedCookieData = decodeURIComponent(importCookie.value);
	yDebug.print("Import Cookie : " + decodedCookieData, YB_LOG_MESSAGE);
	var cookieData =  decodedCookieData.split("|");
	var map = new Object();
	for(i=0;i<cookieData.length;i++){
		var pair = cookieData[i].split("=");
		map[pair[0]]=pair[1];
	}
    var tagsArray = map["usertags"] ? map["usertags"].split("+") : [];
	// TBD: handle easy vs custom and test import
	var args = YBJSON.stringify({ addTags: ((map.add_tags == 1) ? tagsArray : []), 
                                addPopularTags: (map.pop_tags ==1), 
                                replaceDuplicates: (map.duplicate==0), 
                                filePath: "", email:(map.email), priv:(map.priv)});
                                   
  	var xpcArgs = Components.classes["@mozilla.org/supports-string;1"].
                  createInstance(Components.interfaces.nsISupportsString);
  	var xpcSubject = Components.classes["@mozilla.org/supports-string;1"].
                      createInstance(Components.interfaces.nsISupportsString);
  	xpcSubject.data = "startImport";
  	xpcArgs.data = args;
     var os = Components.classes["@mozilla.org/observer-service;1"]
                                   .getService(Components.interfaces.nsIObserverService);                
  	 os.notifyObservers(xpcSubject, "ybookmark.importBookmarks", xpcArgs);
	} catch (e) {
		yDebug.print("ybookmarksOverlay.js::_importBookmarks()=> Exception: "+e, YB_LOG_MESSAGE);
	}
   },
   _cookieObserver: {
     observe: function(subject, topic, data) {
     	if(!ybookmarksUtils.isRecentWindow()) {
     		yDebug.print("ybookmarksOverlay.js::_cookieObserver()=> Returning quietly as this is not recentWindow. ");
     		return;
     	}     	
	    if (data == "added" || data == "changed") {
	      try {
	        var cookie = subject.QueryInterface ( Components.interfaces.nsICookie );
		    var prefDomain = ybookmarksUtils._DOTCOMHOST;
			yDebug.print("ybookmarksOverlay.js::_cookieObserver()=> cookie name = " +cookie.name+" cookie host = "+cookie.host+" pref domain = "+prefDomain);
			// $$$ temporary code (adding "." for testing
		    if (cookie.host == prefDomain && cookie.name == DEL_COOKIE_EXT_IMPORT) {
	        	yDebug.print("ybookmarksOverlay.js::_cookieObserver=>Import Cookie Added or Modified",
	        		YB_LOG_MESSAGE);
	        	try {	
	        	    //Delete the import cookie.
	        	    var ckMgr = Components.classes["@mozilla.org/cookiemanager;1"]
                                                   .getService(Components.interfaces.nsICookieManager);	
                    ckMgr.remove(cookie.host, cookie.name, cookie.path, false);
                } catch(e) {
                    yDebug.print("exception on ybookmarksOverlay.js::_cookieObserver=>cookiedelete:" + e, YB_LOG_MESSAGE);
                }                                               
	           	if (YBidManager.isUserLoggedIn()){
	           		//Start import after a import status poll check.
	           		setTimeout( function() {
	           			try {
	           				ybookmarksMain._startImportAfterPolling(cookie);
	           			} catch(e) {
	           				yDebug.print("exception on ybookmarksOverlay.js::_cookieObserver=>_startImportAfterPolling", YB_LOG_MESSAGE);
	           			}
	           		}, 
	           		0);
	        		//ybookmarksMain._importBookmarks(cookie);
	        	}
	        }
                //Look for twitter oauth cookie
                if ( (cookie.host == prefDomain) && cookie.name == DEL_XTOAUthCookie) {
                  var tweetAllPublic = false;
                  if(cookie.value == "twitter%3A1") {//tweet all public.
                     tweetAllPublic = true;
                  }
                  //Store in localstore.
                  var storeService = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
                                       getService(Components.interfaces.nsIYDelLocalStore);
		  storeService.updateProviderInfo(DEL_PROVIDER_TWITTER, "", "true", tweetAllPublic ? "true": "");
                }
                
	        //This is safe, if user sign-in in any, allow sync
	        if ( (cookie.host == prefDomain) && cookie.name == "_user") {	        	
	        	yDebug.print("ybookmarksOverlay.js::_cookieObserver()=> _user cookie added",YB_LOG_MESSAGE);
	        	// If user cookie is added and engine is installed allow sync
	        	if (ybookmarksMain.isEngineInstalled()) {
	        		yDebug.print("ybookmarksOverlay.js::_cookieObserver()=> allowing sync...",YB_LOG_MESSAGE);
		        	var ss = Components.classes["@mozilla.org/ybookmarks-sync-service;1"]
		        		.getService(Components.interfaces.nsIYBookmarkSyncService);
					ss.allowSync();
	        	}
	         }	        
	      } catch ( e ) {
	        yDebug.print("ybookmarksOverlay.js::_cookieObserver()=>Exception: " + e,YB_LOG_MESSAGE);
	      }
	    }
	  }
	},
	
	/**
	 * Function opens new dialog for jump to tags
	 */ 
	jumpToTag: function() {
		if(YBidManager.isUserLoggedIn() && ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_STANDARD) {
		    var win = window.openDialog( "chrome://ybookmarks/content/ybJump.xul",
	               "",
	               "chrome,centerscreen,modal,dialog=no,resizable=no");
		}
	},
	
	/**
	 * Function opens new dialog showing delicious options
	 */
	 showDeliciousOptions: function () {	
		if (!gPrefsWindow || gPrefsWindow.closed) {
	    	gPrefsWindow = window.openDialog("chrome://ybookmarks/content/options.xul", "Delicious Options","chrome,titlebar,toolbar,centerscreen,dialog=no");
	    	gPrefsWindow.focus();
	    } else {
	    	gPrefsWindow.focus(); 
	    }
	 }
};


var YbookmarkUpdateObserver = {

  _total: null,
  _prevdone: 0,
  _chunk: 0,
  _done: 0,
  __timer: null,
  _failCount: 0,
  _maxFailures: -1,  
  _periodicFailCount : 0,
  _maxPeriodicFail : 3,
  
  get _timer() {
    if ( !this.__timer ) {
      this.__timer = Components.classes["@mozilla.org/timer;1"].createInstance( Components.interfaces.nsITimer );
    }
    return this.__timer;
  },
  _pgrMeter: null,

  notify: function(aTimer) {
    if ( !this._pgrMeter )
      this._pgrMeter = document.getElementById("ybookmark-progressmeter" ),

    this._pgrMeter.value = ( this._prevdone * 100 ) / this._total;
    this._prevdone += 2;
  }, 

  observe: function ( subject, topic, data ) {
    try {
    var pgrText = document.getElementById("ybookmark-progresstext" );
    var pgrMeter = document.getElementById("ybookmark-progressmeter" );
    var pgrStatus = document.getElementById("ybookmark-progress-statusbarpanel" );
    var strings = document.getElementById( "ybookmarks-strings" );
    if (! (pgrMeter)) {
      return;
    }

    if ( topic == "ybookmark.syncBegin" ) {

      if (data != "remove-bookmarks" && data != "remove-extra") {
         pgrStatus.collapsed = false;
         pgrText.collapsed = false;
         pgrMeter.collapsed = false;
         pgrMeter.value = "1";
         pgrText.value = strings.getString( "extensions.ybookmarks.statusbar.downloading" );
         this._total = null;
         this._done = 0;
       }

    } else if ( topic == "ybookmark.syncDone" ) {

      if ( data == "no-update" ) {

        pgrText.value = strings.getString( "extensions.ybookmarks.statusbar.downloaddone" );
        setTimeout( function() { pgrStatus.collapsed = true; pgrText.collapsed = true; pgrMeter.collapsed = true; }, 2000 );

      } else if ( data == "all-done" ) {

        this._timer.cancel();
        pgrMeter.value = "100";
        pgrText.value = strings.getString( "extensions.ybookmarks.statusbar.downloaddone" );
        setTimeout( function() { pgrStatus.collapsed = true; pgrText.collapsed = true; pgrMeter.collapsed = true; }, 2000 );
      } else if (data == "sync-aborted") {
      	  pgrMeter.value = "100";         
          var pgrText = document.getElementById("ybookmark-progresstext" );
          pgrText.value = strings.getString( "extensions.ybookmarks.statusbar.downloadfail" );
          pgrText.collapsed = false;
          
          pgrStatus.collapsed = false;
          pgrText.collapsed = false;
          pgrMeter.collapsed = false;
          setTimeout( function() { pgrStatus.collapsed = true; pgrText.collapsed = true; pgrMeter.collapsed = true; }, 2000 );
     } else if (data == "full-sync-error") {
        this._failCount++;        
        yDebug.print("Full Sync failed. Attempt #" + this._failCount);
        
        if (this._maxFailures == -1) {
          this._maxFailures =
            ybookmarksMain.prefs.getIntPref(
              "extensions.ybookmarks@yahoo.sync.attempts");
        }
        
        if (this._failCount < this._maxFailures) {
          this._timer.cancel();
          pgrMeter.value = "1";
          yDebug.print("Rescheduling, Full sync failed#:" + this._failCount, YB_LOG_MESSAGE);
          setTimeout( function() { ybookmarksMain.syncservice.sync(false); }, Y_SYNC_ATTEMPT_WAIT );
        } else {
          yDebug.print("Syncing failed repeatedly. Aborting");
          this._timer.cancel();
          pgrMeter.value = "100";
          pgrText.value = strings.getString( "extensions.ybookmarks.statusbar.downloadfail" );
          pgrStatus.collapsed = false;
          pgrText.collapsed = false;
          pgrMeter.collapsed = false;
          setTimeout( function() { pgrStatus.collapsed = true; pgrText.collapsed = true; pgrMeter.collapsed = true; }, 2000 );
        }
      } else if (data == "periodic-sync-error") {
        this._periodicFailCount++;
        yDebug.print("Periodic sync failed, failure#:" + this._periodicFailCount, YB_LOG_MESSAGE);
        if(this._periodicFailCount <= this._maxPeriodicFail) {
            yDebug.print("Rescheduling, Periodic sync failed#:" + this._periodicFailCount, YB_LOG_MESSAGE);
            setTimeout( function() { ybookmarksMain.syncservice.sync(true); }, Y_SYNC_ATTEMPT_WAIT );
        }        
      }
    } else if ( topic == "ybookmark.syncInfo" ) {
      
      if ( data == "add-to-ds-begin" ) {
        if ( this._total ) {
          var mid = ( this._prevdone +  this._chunk / 2 );
          var value = (( 100 * mid ) / this._total);
          pgrMeter.value = value; 
        }

      }  else if ( data == "add-to-ds-end" ) {
            if ( this._total ) {
              this._timer.cancel();
              var value = (( 100 * this._done ) / this._total);
              pgrMeter.value = value; 
            }
            
      } else if ( data == "more-chunk" ) {

        pgrMeter.collapsed = false;
        // subject has first and chunk element assigned to it
        if ( subject && subject.wrappedJSObject ) {
          subject = subject.wrappedJSObject;
        }

        if ( !subject ) {
          return;
        }

        this._timer.cancel();
        this._total = subject.total;
        this._chunk = subject.chunk;
        this._prevdone = this._done;
        this._done += subject.chunk;
        this._timer.initWithCallback( this, 100, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK );
      } 
      
    } else if (topic == "ybookmark.forceRefresh") {    
        if (window == ybookmarksUtils.getTopWindow()) {
          setTimeout(ybookmarksMain.forceRefresh, 500);        
        }
    } else if (topic == "ybookmark.forceFFRestart") {
      try {              
        setTimeout(function() { ybookmarksUtils._quit(true);}, 100);        
      } catch(e) {}
    }
  } catch (e) {
    yDebug.print("YbookmarkUpdateObserver.observe(" + subject + ", " + topic + ", " + data + "): " + e, YB_LOG_MESSAGE);
  }
  }
};

/**
 * Object that observes the extension manager for any changes in the state of
 * an extension. It's used to detect when this extension is being uninstalled
 * or disabled by the user.
 */
var yUninstallObserver = {
   /* indicates whether the extension is set to be uninstalled. */
   _uninstall : false,
   /* cached copy of the bookmarks store. */
   _bmStore: null,
  
   /**
    * Observes any changes in a particular "topic". In this case we're observing
    * changes in the extension manager and closing the application.
    * @param subject the object that experienced the change.
    * @param topic the topic being observed.
    * @param data the data relating to the change.
    */
   observe : function(subject, topic, data) {
      /*
      var wm =
         Components.classes["@mozilla.org/appshell/window-mediator;1"].
            getService(Components.interfaces.nsIWindowMediator);
      var winEnumerator = wm.getEnumerator("navigator:browser");
      // this guarantees that having multiple windows won't cause problems.
      var isFirstWindow = (winEnumerator.getNext() == window);
      */
      if (topic == "em-action-requested") {
         subject.QueryInterface(Components.interfaces.nsIUpdateItem);
         if (subject.id == YBOOKMARKS_ID) {
            if (data == "item-uninstalled") {                
                this._uninstall = true;
                var syncService = Components.classes[Y_kSyncServiceContractID].
                    getService(Components.interfaces.nsIYBookmarkSyncService);
                syncService.cancelSync();
                try {
                ybookmarksMain.prefs.setBoolPref("extensions.ybookmarks@yahoo.localstore.uninstall.delete", true);                
                } catch(e){}
            } else if (data == "item-cancel-action") {
               /* uninstall and disable may be cancelled by selecting "Enable"
                  from the context menu. */               
               this._uninstall = false;
               try {
                ybookmarksMain.prefs.setBoolPref("extensions.ybookmarks@yahoo.localstore.uninstall.delete", false);
                ybookmarksMain.prefs.setBoolPref("extensions.ybookmarks@yahoo.extension.disabled", false);
               } catch(e){}
            } else if(data == "item-disabled") {
                try {
                    ybookmarksMain.prefs.setBoolPref("extensions.ybookmarks@yahoo.extension.disabled", true);
                } catch(e){}
            } else if(data == "item-enabled") {
                try {
                    ybookmarksMain.prefs.setBoolPref("extensions.ybookmarks@yahoo.extension.disabled", false);
                } catch(e){}
            }
         }
      }
   },
      
   /**
    * Registers the observer to check for extension update and application exit
    * events.
    * @strings string bundle used for the dialog.
    */
   register: function() {
      var observerService = 
         Components.classes["@mozilla.org/observer-service;1"].
            getService(Components.interfaces.nsIObserverService);
 
      observerService.addObserver(this, "em-action-requested", false);
      observerService.addObserver(this, "quit-application-granted", false);
   },

   /**
    * Unregisters the observer.
    */
   unregister: function() {
      var observerService = 
        Components.classes["@mozilla.org/observer-service;1"].
           getService(Components.interfaces.nsIObserverService);
  
      observerService.removeObserver(this,"em-action-requested");
      observerService.removeObserver(this,"quit-application-granted");
   }
};

var ybUserInterface = {
  
  _prefs: null,
  _strings: null,
  
  register: function(attribute){
    this._prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch);
    this._prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
    this._prefs.addObserver("extensions.ybookmarks@yahoo.original", this.prefsObserver, false);
    
    this._strings = document.getElementById( "ybookmarks-strings" );
  },
  
  unregister: function(attribute){
    this._prefs.removeObserver("extensions.ybookmarks@yahoo.original", this.prefsObserver);
  },
  
  prefsObserver: {
    observe : function(subject, topic, data) {
      if (data == "extensions.ybookmarks@yahoo.original.ui.hide") {
        var hideUI = ybUserInterface._prefs.getBoolPref("extensions.ybookmarks@yahoo.original.ui.hide");
        var remap = ybUserInterface._prefs.getBoolPref("extensions.ybookmarks@yahoo.original.keybindings.remap");
  
        ybUserInterface.tweakBookmarksUI(hideUI);
        ybUserInterface.tweakKeyBindings(remap);
      } else if (data == "extensions.ybookmarks@yahoo.original.keybindings.remap") {
        var remap = ybUserInterface._prefs.getBoolPref("extensions.ybookmarks@yahoo.original.keybindings.remap");
        ybUserInterface.tweakKeyBindings(remap);
      }
    }
  },
  
  setHideUI: function (hide) {
    hide = hide ? true : false;
    this._prefs.setBoolPref("extensions.ybookmarks@yahoo.original.ui.hide", hide);
  },
  
  setRemapKeyBindings: function(remap) {
    remap = remap ? true : false;
    this._prefs.setBoolPref("extensions.ybookmarks@yahoo.original.keybindings.remap", remap);    
  },
  //set no shortcut - helper function
  setNoShortcut : function(elem) {
    var el = document.getElementById(elem);
    if(el) {
        el.setAttribute("key", "\n");
        el.setAttribute("modifiers", "");
    }
  },
  
  setNoShortcutsForAll : function() {
    this.setNoShortcut("key_openYBookmarksSidebar");
    this.setNoShortcut("keyJumpToTag");
    this.setNoShortcut("key_myDelicious");
    this.setNoShortcut("addYBookmarkAsKb");
  },
  
  setYBShortcut : function(elem, key, modifier) {
    try {
        var el = document.getElementById(elem);
        if(el) {
            var modif = this._prefs.getCharPref(modifier);
            if(modif != "none") {
                el.setAttribute("key", this._prefs.getCharPref(key));
                el.setAttribute("modifiers", modif);
            } else {
                this.setNoShortcut(elem);
            }
        }
    } catch(e) {
        this.setNoShortcut(elem);
        yDebug.print("ybUserInterface.setYBShortcut:" + e + " key:"+ key + " modifier:" + modifier, YB_LOG_MESSAGE);
    }
  },
    
  /*
   * Currently, we keep the "intended" bindings for add and sidebar in the locale files.  
   * We then backup and keybindings with yb_backup_*.  The secondary bindings are kept in
   * the preferences
   */
  tweakKeyBindings: function(remap) {    
    try {
        if (!document.getElementById("viewBookmarksSidebarKb")) { return; }

        this.setYBShortcut("addBookmarkAsKb",
                           "extensions.ybookmarks@yahoo.keybindings.add.key",
                           "extensions.ybookmarks@yahoo.keybindings.add.modifiers");
        this.setYBShortcut("viewBookmarksSidebarKb",
                           "extensions.ybookmarks@yahoo.keybindings.sidebar.key",
                           "extensions.ybookmarks@yahoo.keybindings.sidebar.modifiers");
        /**
        * Attach key shortcuts to keys in xul keyset
        */
        this.setYBShortcut("addYBookmarkAsKb",
                           "extensions.ybookmarks@yahoo.keybindings.delBookmarkPage.key",
                           "extensions.ybookmarks@yahoo.keybindings.delBookmarkPage.modifiers");
                               
        this.setYBShortcut("key_myDelicious",
                           "extensions.ybookmarks@yahoo.keybindings.bookmarksOnDelicious.key",
                           "extensions.ybookmarks@yahoo.keybindings.bookmarksOnDelicious.modifiers");
                               
        if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_STANDARD) {
            this.setYBShortcut("key_openYBookmarksSidebar",
                               "extensions.ybookmarks@yahoo.keybindings.delSidebar.key",
                               "extensions.ybookmarks@yahoo.keybindings.delSidebar.modifiers");
            this.setYBShortcut("keyJumpToTag",
                               "extensions.ybookmarks@yahoo.keybindings.jumpToTag.key",
                               "extensions.ybookmarks@yahoo.keybindings.jumpToTag.modifiers");
        } else { //classic mode: disable these keys and assign empty string to avoid mapping to all key strokes.
            this.setNoShortcut("key_openYBookmarksSidebar");
            this.setNoShortcut("keyJumpToTag");
        }
    } catch (e) {
      yDebug.print("ybUserInterface.tweakKeyBindings():" + e, YB_LOG_MESSAGE);
    }
  },
  
  tweakBookmarksUI: function(hideUI) {
    try {
    //FF3 id names
    var bookmarksMenuId = "bookmarksMenu";
    var bookmarksMenuPopup = "bookmarksMenuPopup";    
    if(ybookmarksUtils.getFFMajorVersion() < 3) { 
        //FF2 id names    		
	  	bookmarksMenuId = "bookmarks-menu";		  	
	  	bookmarksMenuPopup = "menu_BookmarksPopup";	  	
	}
    
    //This is to work around a crash in Leopard.
    if(ybookmarksUtils.isOSXLeopard()) {    
       //Hide these menu items
       var showBookmarksMenu = document.getElementById("yb-broadcaster-bookmarksmenu-show");
	   var hideBookmarksMenu = document.getElementById("yb-broadcaster-bookmarksmenu-hide");
	   showBookmarksMenu.setAttribute("hidden", true);
	   hideBookmarksMenu.setAttribute("hidden", true);
	   //On classic mode add menu items.
	   if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)  {
	       var bookmarksMenuPopup = document.getElementById(bookmarksMenuPopup);
	       if (!bookmarksMenuPopup.ybTweaked) {
              // we need to add and remove the items because of the bookmarks templates messes up the separator
              bookmarksMenuPopup.setAttribute("onpopupshowing", " if (event.target == this) { ybookmarksMain.onBookmarksMenuPopupShowing(event);}" + bookmarksMenuPopup.getAttribute("onpopupshowing"));
              bookmarksMenuPopup.ybTweaked = true;
    }
	  }
       return;
	  }

    hideUI = hideUI ? true : false;
    
     var bookmarksMenu = document.getElementById(bookmarksMenuId);
     if (bookmarksMenu) {
        //This has some problem in OSX Leopard
        bookmarksMenu.setAttribute('hidden', hideUI);
     }
     
    var frame = document.getElementById("frame");
    if (frame) {
    var frameMenu = frame.childNodes[0];
    var oldItem = frameMenu.childNodes[6]; // Bookmark This Frame...
      
      // hide the contentAreaContextMenu items
      // hidden and collapsed are necc because normal context menu functionality futzes with hidden
      var bmLink = document.getElementById("context-bookmarklink");
      bmLink.hidden = hideUI; 
      bmLink.collapsed = hideUI;
      var bmPage = document.getElementById("context-bookmarkpage");
      bmPage.hidden = hideUI;
      bmPage.collapsed = hideUI;

      oldItem.hidden = hideUI;
      oldItem.collapsed = hideUI;

      bmThisFrame = document.getElementById("yb_bookmark_this_frame_item");
      if (!bmThisFrame) {
        var bookmarkFrameItem = document.createElement("menuitem");
        bookmarkFrameItem.setAttribute("id", "yb_bookmark_this_frame_item");
        bookmarkFrameItem.setAttribute("label", this._strings.getString("extensions.ybookmarks.context.bookmark.frame"));
        bookmarkFrameItem.setAttribute("command", "cmd_yb_bookmark_this_frame");
        bookmarkFrameItem.setAttribute("class", "menuitem-iconic");
        bookmarkFrameItem.setAttribute("image", "chrome://ybookmarks/skin/delicious_context.png");
        frameMenu.insertBefore(bookmarkFrameItem, oldItem.nextSibling);
      }
      
    }
      //bookmarks menu
        var bookmarksMenuPopup = document.getElementById(bookmarksMenuPopup);
        if (!bookmarksMenuPopup.ybTweaked) {
          // we need to add and remove the items because of the bookmarks templates messes up the separator
        bookmarksMenuPopup.setAttribute("onpopupshown", "if (event.target == this) { ybookmarksMain.onBookmarksMenuPopupShowing(event);}");
        bookmarksMenuPopup.ybTweaked = true;
      }
      
      var tabbrowser = getBrowser();
      var tabMenu = document.getAnonymousElementByAttribute(tabbrowser,"anonid","tabContextMenu");
      //Show/Hide Our Mainu Menu for Bookmarks "Show Bookmarks Menu" and "Hide Bookmarks Menu"
      //:::Classic mode doesnt need this.Coz we dont hide or show bookmarks menu.
		if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_STANDARD)  {	     
		  var showBookmarksMenu = document.getElementById("yb-broadcaster-bookmarksmenu-show");
		  var hideBookmarksMenu = document.getElementById("yb-broadcaster-bookmarksmenu-hide");
		  showBookmarksMenu.setAttribute("hidden", !hideUI);
		  hideBookmarksMenu.setAttribute("hidden", hideUI);
		} 
      
      if (tabMenu && !tabMenu.ybTweaked) {        
        var insertPos = tabMenu.lastChild.previousSibling;
        var ffbmAll = null;
        var ffbmCur = null;                
        var tabContextMenuItem = insertPos.previousSibling;
        while(tabContextMenuItem && (!ffbmAll || !ffbmCur)) {
            if (tabContextMenuItem.getAttribute("command") == "Browser:BookmarkAllTabs") {
                ffbmAll = tabContextMenuItem;
            } else if (tabContextMenuItem.getAttribute("oncommand") == "BookmarkThisTab();") {
                ffbmCur = tabContextMenuItem;
            }
            tabContextMenuItem = tabContextMenuItem.previousSibling;            
        }
        
        if (ffbmAll) {
          ffbmAll.hidden = hideUI;
          ffbmAll.collapsed = hideUI;
        }
        if (ffbmCur) {
          ffbmCur.hidden = hideUI;
          ffbmCur.collapsed = hideUI;         
        }
        var hideYBContextMenu = false;
        try  {        
            hideYBContextMenu = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).getBoolPref("extensions.ybookmarks@yahoo.contextmenu.hide");  
        } catch(e) {
            yDebug.print("Exception while accessing user preference:" + e);
        }
        //Adding our menu in the tabmenu
        if(!hideYBContextMenu) {          
            var bookmarkCurTabItem = document.createElement("menuitem");
            bookmarkCurTabItem.setAttribute("label", this._strings.getString("extensions.ybookmarks.context.bookmark.tab"));
            bookmarkCurTabItem.setAttribute("oncommand", "ybookmarksMain.bookmarkThisTab();");
            tabMenu.insertBefore(bookmarkCurTabItem, insertPos);
        }
        tabMenu.ybTweaked = true;
      }      
    } catch (e) {
      yDebug.print("ybUserInterface.tweakBookmarksUI(): " + e);
    }
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

/* End - Add Bookmark Call Backs */
/* Helper functions */
function yb_onLoad(event) {
  try {
     ybookmarksMain.onLoad(event);
  } catch (e) {
     yDebug.print("Uncaught error during onload:" + e.message + (e.stack ? e.stack : ""), YB_LOG_MESSAGE);
     throw e;
  }
}

function yb_onUnload(event) {
  try {
     ybookmarksMain.onUnload(event);
  } catch (e) {
     yDebug.print("Uncaught error during unload:" + e.message + (e.stack ? e.stack : ""), YB_LOG_MESSAGE);
     throw e;
  }
}
/* End of Helper functions */

/**
 * Listner class for adress bar changes to provide data for tagometer
 */
var urlBarListenerFavIcon = {
  onLocationChange: function() {},
  onStateChange: function() {},
  onProgressChange: function() {},
  onStatusChange: function() {},
  onSecurityChange: function() {},
  onLinkIconAvailable: function(aBrowser) {           
    try {
        var iconURL = null;
        if(!aBrowser.currentURI) aBrowser = gBrowser;
        if(!aBrowser.currentURI) return;
        
        //doesnt matter if I dont get favicon
        try {
          iconURL = (aBrowser.mIconURL) ? aBrowser.mIconURL : aBrowser.getIcon();
        } catch(e) {}
        
        //pass URL and icon url
        gYB_loadFavIconNew(aBrowser.currentURI.spec, iconURL);
    } catch(e) {
      yDebug.print("urlBarListenerFavIcon.onLinkIconAvailable(): " + e, YB_LOG_MESSAGE);
    }
  }
};

/**
 * Idle process observer
 * 1. Updates favicons when idle time is more than 10 seconds
 */
var idleServiceObserver = {
	observe: function (subject, topic, data) {
		try {
//				yDebug.print("idleProcessObserver.observe() "+topic, YB_LOG_MESSAGE);

			var localStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
			getService(Components.interfaces.nsIYDelLocalStore);

			if(topic == "back") {
				localStore.stopUpdatingFavicons();				
			}
			else if(topic == "idle") {
				var ss = Components.classes["@mozilla.org/ybookmarks-sync-service;1"]
				.getService(Components.interfaces.nsIYBookmarkSyncService);
				var del = Components.classes[Y_kDelContractID].getService( Components.interfaces.nsISocialStore );
				var username = del.getUserName();

				if(ss.isSyncing()) return;
				if(!username) return;
				if(window != ybookmarksUtils.getTopWindow()) return;

				var updateFavicons = false;

				try {
					var prefService = Components.classes["@mozilla.org/preferences-service;1"]
					.getService(Components.interfaces.nsIPrefBranch);
					updateFavicons = prefService.getBoolPref("extensions.ybookmarks@yahoo.updateFaviconsWhenIdle");
				} catch (e) {}

				if(updateFavicons) {
					localStore.startUpdatingFavicons();				
				}
			}
		} catch(e) {
			yDebug.print("idleProcessObserver.observe(): " + e, YB_LOG_MESSAGE);
		}
	}
};

window.addEventListener("load",
                          yb_onLoad,
                          false);
window.addEventListener("unload",
                          yb_onUnload,
                          false);


