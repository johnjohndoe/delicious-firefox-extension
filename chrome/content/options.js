var gYBLoginWindow = null;
var gYBCreateWindow = null;
var _ybookmark_options_inited = false;
var YBobservService = Components.classes["@mozilla.org/observer-service;1"].
                      getService( Components.interfaces.nsIObserverService);
var gKeyMapChanged = false;

var gOptionsArr = ["accel", "accel,shift", "none"];

var gybAwesomeBarOptionsFlags = [];

var YBcookieObserver = {
  observe: function(subject, topic, data ) {
    if (data == "added" || data == "changed" || data == "deleted" || data=="loggedin" ) {
      try {
          if (gYBLoginWindow) {
            gYBLoginWindow.close();
            gYBLoginWindow = null;
          }
          if (gYBCreateWindow) {
            gYBCreateWindow.close();
            gYBCreateWindow = null;
          }
          if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)  {	    
            //ybookmarks_ClassicOptions_UpdateAccountUserId();
          } else {
            ybookmarks_Options_UpdateAccountUserId();
          }
      } catch ( e ) {
        // ignore exception
      }
    }
  }
};

var YBSyncFinishObserver = {
  observe: function(subject, topic, data ) {
    if (topic == "ybookmark.syncDone" && (data == "all-done" || data == "full-sync-error" || data == "sync-aborted")) {
      ( document.getElementById( "desc_syncStatus" ) ).hidden = true;
    }
  }
};


function ybookmarks_InitClassicOptions() {
    try {
       //Hide standard tabs
       var hideList = [ "ybPrefBookmarksGeneralTab",
                        "ybPrefBookmarksAdvancedTab",
                      ];	    	
	   for (el in hideList) {
	       var elem = document.getElementById(hideList[el]);
	       if(elem) {	    			
	        elem.hidden = true;
	       }
	   }
	   //Show classic tab
	   var elem = document.getElementById("ybPrefBookmarksClassicTab");
	   if(elem) {	    			
        elem.hidden = false;
       }       
       //Set focus on the correct tab       
       var tab_box = document.getElementById("ybPrefBookmarksTabBox");
       var classicTab = document.getElementById("ybPrefBookmarksClassicTab");
       var classicPanel = document.getElementById("ybPrefClassicTabPanel");
       tab_box.selectedTab = classicTab;
       tab_box.selectedPanel = classicPanel;
       
       /*
       var serviceName = deliciousService.getServiceName();
       var strings = document.getElementById( "ybookmarks-option-strings" );
       var createDesc = document.getElementById( "ybookmarks-account-create-classic" );
       createDesc.setAttribute( "value",
                                  strings.getString( "extensions.ybookmarks.create" )
                              );
       YBobservService.addObserver( YBcookieObserver, "ybookmark.userChanged", false );                           
       ybookmarks_ClassicOptions_UpdateAccountUserId();     
       document.getElementById ( "ybookmarks-account-login-classic" ).addEventListener ( "click", yb_options_openLoginWindow, false );
       document.getElementById ( "ybookmarks-account-create-classic" ).addEventListener ( "click", yb_options_openCreateUserWindow, false );              
       window.addEventListener("unload", ybookmarks_CleanupOptions, false);
       */
       _ybookmark_options_inited = true;
    } catch(e) {
        yDebug.print("ybookmarks_InitClassicOptions()" + e );
    }   
}

/*
 * This function gets called on prefpane's onload.
 */
 
function ybookmarks_InitOptions() {
try {
  if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)  {	   
    ybookmarks_InitClassicOptions();
    return;
  }  
  var serviceName = deliciousService.getServiceName();
  var strings = document.getElementById( "ybookmarks-option-strings" );

  //var accountDesc = document.getElementById( "ybookmarks-account-desc" );
 
  var createDesc = document.getElementById( "ybookmarks-account-create" );

/*  ybookmarks_removeAllChildren ( accountDesc );*/

  /*accountDesc.appendChild ( document.createTextNode (
                              bundle.getString( descKey )
                            )
                          );
*/
  createDesc.setAttribute ( "value",
                              strings.getString( "extensions.ybookmarks.create" )
                          );

  YBobservService.addObserver( YBcookieObserver, "ybookmark.userChanged", false ); 
  YBobservService.addObserver( YBSyncFinishObserver, "ybookmark.syncDone", false ); 

  // update the username in options
  ybookmarks_Options_UpdateAccountUserId();  
  //Disable the switch mode buttton.
  var pref = Components.classes["@mozilla.org/preferences-service;1"].
	         getService(Components.interfaces.nsIPrefBranch);
  try {
  	var modeChange = pref.getCharPref("extensions.ybookmarks@yahoo.engine.set.mode");
  	if(modeChange == YB_EXTENSION_MODE_CLASSIC) {
  		var switchButton = document.getElementById("btn_classic_mode");
  		switchButton.disabled = true;
  	}
  } catch(e) {}

  document.getElementById ( "ybookmarks-account-login" ).addEventListener ( "click", yb_options_openLoginWindow, false );
  document.getElementById ( "ybookmarks-account-create" ).addEventListener ( "click", yb_options_openCreateUserWindow, false );

  window.addEventListener("unload", ybookmarks_CleanupOptions, false);
  
  var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefBranch);
  var debug = false;
  try {
    debug = prefs.getBoolPref("extensions.ybookmarks@yahoo.debug");
  } catch (e) {}
  
  if (debug) {
    var toolbarTab = document.getElementById("ybPrefBookmarksToolbarTab");
    var debugTab = document.getElementById("ybPrefBookmarksDebugTab");
    toolbarTab.hidden = false;
    debugTab.hidden = false;
  }
  
  ybookmarks_Options_onTagsViewOverflowEnable(document.getElementById("pref-ybookmarks-tagsview-overflow-enable-checkbox"));
  ybookmarks_Options_onOriginalUIHide(document.getElementById("pref-ybookmarks-original-ui-hide-checkbox"));
  
  //Hack for Leopard bug : crash on hiding bookmarks menu.
  if(ybookmarksUtils.isOSXLeopard()) {    
    document.getElementById("pref-ybookmarks-original-ui-hide-checkbox").hidden = true;
  }
  
  //show firefox 3 specific preferences
  if(ybookmarksUtils.getFFMajorVersion() > 2) {
    document.getElementById("ybPrefBookmarksAwesomebarTab").hidden = false;
  }
  
  _ybookmark_options_inited = true;
  
  ybookmarksOptionsCheckAwesomeBarIntegration();
  
} catch (e) {
  yDebug.print("ybookmarks_InitOptions()" + e );
}
}

function ybookmarks_Options_UpdateAccountUserId() {
  try {
  	var strings = document.getElementById( "ybookmarks-option-strings" );
	  var login = document.getElementById( "ybookmarks-account-login" );
    var userPre = document.getElementById("ybookmarks-account-user-pre");
    var userPost = document.getElementById("ybookmarks-account-user-post");
    var user = document.getElementById("ybookmarks-account-user");

	  var username = deliciousService.getUserName();
	  var loginString;
	  if ( username == null ) {
	    loginString = strings.getString("extensions.ybookmarks.login");
	    userPre.hidden = true;
  	    userPost.hidden = true;
  	    user.hidden = true;
  	    
  	    var syncButton1 = document.getElementById("btn_syncLink");
		syncButton1.setAttribute("disabled","true");
      
	  	/*    var bundle = document.getElementById( "ybookmarks-option-strings" );
	    username = bundle.getString( "extensions.ybookmarks.not.logged.in" );
	*/  } else {
	    var userPreString = strings.getString("extensions.ybookmarks.user.pre");
	    var userPostString = strings.getString("extensions.ybookmarks.user.post");
	    userPre.hidden = false;
	    
	    var syncButton1 = document.getElementById("btn_syncLink");
		syncButton1.setAttribute("disabled","false");
	    
	    userPost.hidden = false;
	    user.hidden = false;
	    user.setAttribute("value", username);
	    user.setAttribute("onclick", "ybookmarksUtils.openLinkToNewTab(deliciousService.getUrl('"+username+"'))");
	    userPre.setAttribute("value", userPreString);
	    userPost.setAttribute("value", userPostString);
    
	    loginString = strings.getString("extensions.ybookmarks.login.diff");
	  }

    login.setAttribute ("value", loginString);

	  var currentUser = document.getElementById( "ybookmarks-account-user" );
	  ybookmarks_removeAllChildren( currentUser );
	  currentUser.appendChild(document.createTextNode(loginString));
	  /*
	  var userKey = "extensions.ybookmarks." + deliciousService.getServiceName() + ".user";
	  currentUser.appendChild ( document.createTextNode (
	                              bundle.getFormattedString( userKey, [ username ] )
	                            )
	                          );*/
  } catch (e) {
    yDebug.print("ybookmarks_Options_UpdateAccountUserId:*******************" + e);
  }
  
}

function ybookmarks_ClassicOptions_UpdateAccountUserId() {
  try {
  	var strings = document.getElementById( "ybookmarks-option-strings" );
	var login = document.getElementById( "ybookmarks-account-login-classic" );
    var userPre = document.getElementById("ybookmarks-account-user-pre-classic");
    var userPost = document.getElementById("ybookmarks-account-user-post-classic");
    var user = document.getElementById("ybookmarks-account-user-classic");

	  var username = deliciousService.getUserName();
	  var loginString;
	  if ( username == null ) {
	    loginString = strings.getString("extensions.ybookmarks.login");
	    userPre.hidden = true;
  	    userPost.hidden = true;
  	    user.hidden = true;
  	    login.hidden = false;
  	    
	  } else {
	    var userPreString = strings.getString("extensions.ybookmarks.user.pre");
	    var userPostString = strings.getString("extensions.ybookmarks.user.post");
	    userPre.hidden = false;
	    userPost.hidden = false;
	    user.hidden = false;
	    user.setAttribute("value", username);
	    user.setAttribute("onclick", "ybookmarksUtils.openLinkToNewTab(deliciousService.getUrl('"+username+"'))");
	    userPre.setAttribute("value", userPreString);
	    userPost.setAttribute("value", userPostString);
    
	    loginString = strings.getString("extensions.ybookmarks.login.diff");
	  }

      login.setAttribute ("value", loginString);

	  var currentUser = document.getElementById( "ybookmarks-account-user-classic" );
	  ybookmarks_removeAllChildren( currentUser );
	  currentUser.appendChild(document.createTextNode(loginString));	  
  } catch (e) {
    yDebug.print("ybookmarks_ClassicOptions_UpdateAccountUserId:*******************" + e);
  }
  
}

function ybookmarks_CleanupOptions() {

  // remove 
  try {
    YBobservService.removeObserver( YBcookieObserver, "ybookmark.userChanged" );
  } catch ( e ) {
    // ignore exception
  }
  
  try {
    YBobservService.removeObserver( YBSyncFinishObserver, "ybookmark.syncDone" );
  } catch ( e ) {
      // ignore exception
  }

  if (gYBLoginWindow) {
    gYBLoginWindow.close();
    gYBLoginWindow = null;
  }

  if (gYBCreateWindow) {
    gYBCreateWindow.close();
    gYBCreateWindow = null;
  }
  
  if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)  {	          
      document.getElementById ( "ybookmarks-account-login-classic" ).removeEventListener ( "click", yb_options_openLoginWindow, false );
      document.getElementById ( "ybookmarks-account-create-classic" ).removeEventListener ( "click", yb_options_openCreateUserWindow, false );
  } else {
      document.getElementById ( "ybookmarks-account-login" ).removeEventListener ( "click", yb_options_openLoginWindow, false );
      document.getElementById ( "ybookmarks-account-create" ).removeEventListener ( "click", yb_options_openCreateUserWindow, false );  
  }

  YBobservService = null;  
}

function ybookmarks_removeAllChildren(node) {
  while ( node.firstChild ) { node.removeChild ( node.firstChild ); }
}

function yb_options_openLoginWindow() {
  if (gYBLoginWindow && gYBLoginWindow.closed) {
    gYBLoginWindow = null;
  }
  if (!gYBLoginWindow)
    gYBLoginWindow = ybookmarksUtils.openWindow ( deliciousService.getLoginWindowUrl(), "Login into Social bookmarking service", 
                                             550, 550 
                                           );
  else  {
    gYBLoginWindow.location.href = deliciousService.getLoginWindowUrl();
  }
  gYBLoginWindow.focus();
}

function yb_options_openCreateUserWindow() {
  if (gYBCreateWindow && gYBCreateWindow.closed) {
    gYBCreateWindow = null;
  }
  if (!gYBCreateWindow)
    gYBCreateWindow = ybookmarksUtils.openWindow ( deliciousService.getCreateUserUrl(), "Create New User",
                                             900, 900 
                                           );
  else  {
    gYBCreateWindow.location.href = deliciousService.getCreateUserUrl();
  }
  gYBCreateWindow.focus();
}

function ybookmarks_forceRefresh() {
  YBobservService.notifyObservers(null, "ybookmark.forceRefresh", "");
  ( document.getElementById( "desc_syncStatus" ) ).hidden = false;
}

function ybookmarks_sync() {
	var syncService = Components.classes["@mozilla.org/ybookmarks-sync-service;1"].
                           getService(Components.interfaces.nsIYBookmarkSyncService);
    syncService.sync(true);
}

function ybookmarks_Options_showHelpPage() {
  window.close();
  ybookmarksUtils.openLinkToNewTab( deliciousService.getUrl("help"), "current" );
}

function ybookmarks_Options_openLog() {
  window.close();

   var dirService = 
      ( Components.classes[ "@mozilla.org/file/directory_service;1" ] ).getService( 
         Components.interfaces.nsIProperties );
   var logFile = 
      dirService.get( "ProfD", Components.interfaces.nsILocalFile );
   logFile.append( "ybookmarks@yahoo.log" );

   openUILinkIn( "file://" + logFile.path, "tab" );
}

function ybookmarks_Options_onTagsViewOverflowEnable(enabled) {
  var elmts = 
    ["pref-ybookmarks-tagsview-overflow-removefromtoplevel-checkbox", 
  	"pref-ybookmarks-tagsview-overflow-level-box", "pref-ybookmarks-tagsview-overflow-level-label",
  	"pref-ybookmarks-tagsview-overflow-spillover-max-box", "pref-ybookmarks-tagsview-overflow-spillover-max-label",
  	"pref-ybookmarks-tagsview-overflow-spillover-minsize-box", "pref-ybookmarks-tagsview-overflow-spillover-minsize-label"];
  	
  	for (var i=0; i < elmts.length; i++) {
      document.getElementById(elmts[i]).disabled = !enabled.checked;
    }
  
}

function ybookmarks_Options_overflowOnRestoreDefaults() {
 	var prefs = ["pref-ybookmarks-tagsview-overflow-enable",
							  "pref-ybookmarks-tagsview-overflow-removefromtoplevel", 			
						  "pref-ybookmarks-tagsview-overflow-level", 
						  "pref-ybookmarks-tagsview-overflow-spillover-max", 	
						  "pref-ybookmarks-tagsview-overflow-spillover-minsize"];
	for (var i=0; i < prefs.length; i++) {
	  var pref = document.getElementById(prefs[i]);
	  if (pref.hasUserValue) {
	    pref.reset();
	  }
	}
	ybookmarks_Options_onTagsViewOverflowEnable(document.getElementById("pref-ybookmarks-tagsview-overflow-enable-checkbox"));

};

function ybookmarks_Options_onOriginalUIHide(hide) {
  document.getElementById("pref-ybookmarks-original-keybindings-remap-checkbox").disabled = hide.checked;
}

function showEnableTagometerDialog(){

	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
	var strings = document.getElementById( "ybookmarks-option-strings" ); 
	var dialogTitleStr=strings.getString("extensions.ybookmarks.statusbaricons.tagometer.dialogTitle");
 	var dialogInfoStr=strings.getString("extensions.ybookmarks.statusbaricons.tagometer.dialogInfo");
 	var enableButtonStr=strings.getString("extensions.ybookmarks.statusbaricons.tagometer.dialogButton1");
 	var disableButtonStr=strings.getString("extensions.ybookmarks.statusbaricons.tagometer.dialogButton2");
	
	// set the buttons that will appear on the dialog. It should be a set of constants multiplied by button position constants. In this case, 2 buttons appear.
	var flags=promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0 + promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1;

	// Display the dialog box. The flags set above are passed as the fourth argument. 
	// The next three arguments are custom labels used for the buttons, which are used if BUTTON_TITLE_IS_STRING is assigned to a particular button.
	// The last two arguments are for an optional check box.
  	var button_number = promptService.confirmEx(window,dialogTitleStr,
	  					dialogInfoStr,flags,enableButtonStr,disableButtonStr,null, null, {});  	
	return button_number;
}

function confirmEnableTagometer()
{
 var prefs = Components.classes["@mozilla.org/preferences-service;1"]
 		.getService(Components.interfaces.nsIPrefBranch);
 var tagometerCheckbox = document.getElementById("pref-ybookmarks-statusbaricons-includetagometer-checkbox");
 var checkedTagometer = tagometerCheckbox.getAttribute("checked");

  if (checkedTagometer=="true") {// tagometer was not checked, user checks the tagometer
	var button_number = showEnableTagometerDialog();
	if(button_number == 1) { // user selected the disable tagometer button
		tagometerCheckbox.setAttribute("checked","false");
 	}
  }
}

function showEnableCookiesDialog(){
	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
						.getService(Components.interfaces.nsIPromptService);
    
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
 			                .getService(Components.interfaces.nsIPrefBranch);

	var strings = document.getElementById( "ybookmarks-option-strings" ); 
	var dialogTitleStr=strings.getString("extensions.ybookmarks.cookies.dialogTitle");
 	var dialogInfoStr=strings.getString("extensions.ybookmarks.cookies.dialogInfo");
 	var enableButtonStr=strings.getString("extensions.ybookmarks.cookies.dialogButton1");
 	var disableButtonStr=strings.getString("extensions.ybookmarks.cookies.dialogButton2");
    var remindStr = strings.getString("extensions.ybookmarks.cookies.remind");    	
    
	// set the buttons that will appear on the dialog. It should be a set of constants multiplied by button position constants. In this case, 2 buttons appear.
	var flags=promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0 + promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1;
    
    var remindCheck = { value: true };
    
	// Display the dialog box. The flags set above are passed as the fourth argument. 
	// The next three arguments are custom labels used for the buttons, which are used if BUTTON_TITLE_IS_STRING is assigned to a particular button.
	// The last two arguments are for an optional check box.
  	var button_number = promptService.confirmEx(window,dialogTitleStr,
	  					dialogInfoStr,flags,enableButtonStr,disableButtonStr,null, remindStr, remindCheck); 
    
    if (!remindCheck.value) {
        prefs.setBoolPref("extensions.ybookmarks@yahoo.remind.enable.cookie", false);
    }
	  					
	return button_number;
}

function confirmEnableCookies()
{
    try {
 var prefs = Components.classes["@mozilla.org/preferences-service;1"]
 			                .getService(Components.interfaces.nsIPrefBranch);
 var pm = Components.classes["@mozilla.org/permissionmanager;1"]
                            .getService(Components.interfaces.nsIPermissionManager); 			
 //get current pref of cookies.
 var  cookiePref = prefs.getIntPref("network.cookie.cookieBehavior");
 var dotprefDomain = ybookmarksUtils._DOTCOMHOST;
 var prefDomain = dotprefDomain.substring(1, dotprefDomain.length);
 
  if (cookiePref == 2) {
        // This section is entered if cookies are disabled
        /**
         * Check if user already logged in
         */
        if(YBidManager.isUserLoggedIn()) {
            return;
        }
        
        /**
         * check if domain is added as exception from permission manager
         */
        var exceptionFound = false;
        var enumerator = pm.enumerator;
        while (enumerator.hasMoreElements()) {
          var nextPermission = enumerator.getNext().QueryInterface(Components.interfaces.nsIPermission);
          if(nextPermission.host == prefDomain && nextPermission.type == "cookie") {
            exceptionFound = nextPermission.host;
            break;
          }
        }
        
        if(exceptionFound) return;
        
        /**
         * show enable cookie dialog
         */
        if(!prefs.getBoolPref("extensions.ybookmarks@yahoo.remind.enable.cookie")) return;
        
	    var button_number = showEnableCookiesDialog();
	    if(button_number == 0) { 
		    // user selected the "Enable Cookies" button
			    prefs.setIntPref("network.cookie.cookieBehavior","0");
	}
  }
  } catch(e) {
    yDebug.print("Exception::options.js::confirmenablecookie "+e, YB_LOG_MESSAGE);
  }
}

function getYBDefaultValue(elem){
    try {
        if(ybookmarksUtils.getFFMajorVersion() > 2) {
            return elem.defaultValue;
        } else {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
 			                    .getService(Components.interfaces.nsIPrefService);            
            return prefs.getDefaultBranch("").getCharPref(elem.name);            
        }
    } catch(e) {
        yDebug.print("Exception::options.js::getYBDefaultValue:" + e, YB_LOG_MESSAGE);
    }
}

function ybookmarks_Options_disableFFCustomShortcuts(chkBox) {

    var useDefault = true;
    if(chkBox && !chkBox.checked) useDefault = false;
    
	var prefArr = {
      ffAddKey : document.getElementById("pref-ybookmarks-keybindings-add"),
      ffAddMod : document.getElementById("pref-ybookmarks-keybindings-add-modifiers"),
      ffBarKey : document.getElementById("pref-ybookmarks-keybindings-sidebar"),
      ffBarMod : document.getElementById("pref-ybookmarks-keybindings-sidebar-modifiers"),
      delAddKey : document.getElementById("pref-ybookmarks-keybindings-delBookmarkPage"),
      delAddMod : document.getElementById("pref-ybookmarks-keybindings-delBookmarkPage-modifiers"),
      delBarKey : document.getElementById("pref-ybookmarks-keybindings-delSidebar"),
      delBarMod : document.getElementById("pref-ybookmarks-keybindings-delSidebar-modifiers"),
	};

    var key1 = document.getElementById("pref-ybookmarks-keybindings-add-textbox");
    var mod1 = document.getElementById("pref-ybookmarks-keybindings-add-modifiers-list");
    
    var key2 = document.getElementById("pref-ybookmarks-keybindings-sidebar-textbox");
    var mod2 = document.getElementById("pref-ybookmarks-keybindings-sidebar-modifiers-list");
    
    var delKey1 = document.getElementById("pref-ybookmarks-keybindings-delBookmarkPage-textbox");
    var delMod1 = document.getElementById("pref-ybookmarks-keybindings-delBookmarkPage-modifiers-list");
    var delKey2 = document.getElementById("pref-ybookmarks-keybindings-delSidebar-textbox");
    var delMod2 = document.getElementById("pref-ybookmarks-keybindings-delSidebar-modifiers-list");
    
    
    if(useDefault) {
        key1.value = getYBDefaultValue(prefArr["delAddKey"]);
        mod1.selectedIndex = gOptionsArr.indexOf(getYBDefaultValue(prefArr["delAddMod"]));
        key1.setAttribute("readonly", "true");
        mod1.setAttribute("readonly", "true");

        key2.value = getYBDefaultValue(prefArr["delBarKey"]);
        mod2.selectedIndex = gOptionsArr.indexOf(getYBDefaultValue(prefArr["delBarMod"]));
        key2.setAttribute("readonly", "true");
        mod2.setAttribute("readonly", "true");
        
        delKey1.value = getYBDefaultValue(prefArr["ffAddKey"]);
        delMod1.selectedIndex = gOptionsArr.indexOf(getYBDefaultValue(prefArr["ffAddMod"]));
        
        delKey2.value = getYBDefaultValue(prefArr["ffBarKey"]);
        delMod2.selectedIndex = gOptionsArr.indexOf(getYBDefaultValue(prefArr["ffBarMod"]));
    } else {
        
        key1.value = getYBDefaultValue(prefArr["ffAddKey"]);
        mod1.selectedIndex = gOptionsArr.indexOf(getYBDefaultValue(prefArr["ffAddMod"]));
        key1.removeAttribute("readonly");
        mod1.removeAttribute("readonly");

        key2.value = getYBDefaultValue(prefArr["ffBarKey"]);
        mod2.selectedIndex = gOptionsArr.indexOf(getYBDefaultValue(prefArr["ffBarMod"]));
        key2.removeAttribute("readonly");
        mod2.removeAttribute("readonly");
        
        delKey1.value = getYBDefaultValue(prefArr["delAddKey"]);
        delMod1.selectedIndex = gOptionsArr.indexOf(getYBDefaultValue(prefArr["delAddMod"]));
        
        delKey2.value = getYBDefaultValue(prefArr["delBarKey"]);
        delMod2.selectedIndex = gOptionsArr.indexOf(getYBDefaultValue(prefArr["delBarMod"]));
    }
}

function ybookmarks_Options_onloadDisableNoneShortcuts() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
 			                .getService(Components.interfaces.nsIPrefBranch);
 	
 	var remap = prefs.getBoolPref("extensions.ybookmarks@yahoo.original.keybindings.remap");
    
    var key1 = document.getElementById("pref-ybookmarks-keybindings-add-textbox");
    var mod1 = document.getElementById("pref-ybookmarks-keybindings-add-modifiers-list");
    var key2 = document.getElementById("pref-ybookmarks-keybindings-sidebar-textbox");
    var mod2 = document.getElementById("pref-ybookmarks-keybindings-sidebar-modifiers-list");
    
    var strings = document.getElementById( "ybookmarks-option-strings" ); 
    
    //change labels of dropdown options to Command for MAC
    if(ybookmarksUtils.getPlatform() === "mac") {
        var elms = document.getElementsByTagName("menuitem");
        
        for (var i = 0; i < elms.length; i++) {
            if(elms[i].value == "accel") elms[i].label = String.fromCharCode(8984);
            if(elms[i].value == "accel,shift") elms[i].label = String.fromCharCode(8984) + " + " + strings.getString("extensions.ybookmarks.shortcuts.shift");
        }
    }
    
    if(ybookmarksUtils.getPlatform() !== "win") {
        //show restart button as well
        document.getElementById("mac-restart").hidden = false;
    }
    
    if(remap) { 	
        key1.removeAttribute("readonly");
        mod1.removeAttribute("readonly");
        
        key2.removeAttribute("readonly");
        mod2.removeAttribute("readonly");
    } else {
        key1.setAttribute("readonly", "true");
        mod1.setAttribute("readonly", "true");
        
        key2.setAttribute("readonly", "true");
        mod2.setAttribute("readonly", "true");
    }

 			                
    if(prefs.getCharPref("extensions.ybookmarks@yahoo.keybindings.delBookmarkPage.modifiers") == "none") {
        document.getElementById("pref-ybookmarks-keybindings-delBookmarkPage-textbox").disabled = true;
    }

    if(prefs.getCharPref("extensions.ybookmarks@yahoo.keybindings.delSidebar.modifiers") == "none") {
        document.getElementById("pref-ybookmarks-keybindings-delSidebar-textbox").disabled = true;
    }

    if(prefs.getCharPref("extensions.ybookmarks@yahoo.keybindings.bookmarksOnDelicious.modifiers") == "none") {
        document.getElementById("pref-ybookmarks-keybindings-bookmarksOnDelicious-textbox").disabled = true;
    }

    if(prefs.getCharPref("extensions.ybookmarks@yahoo.keybindings.jumpToTag.modifiers") == "none") {
        document.getElementById("pref-ybookmarks-keybindings-jumpToTag-textbox").disabled = true;
    }

    if(prefs.getCharPref("extensions.ybookmarks@yahoo.keybindings.add.modifiers") == "none") {
        document.getElementById("pref-ybookmarks-keybindings-add-textbox").disabled = true;
    }

    if(prefs.getCharPref("extensions.ybookmarks@yahoo.keybindings.sidebar.modifiers") == "none") {
        document.getElementById("pref-ybookmarks-keybindings-sidebar-textbox").disabled = true;
    }
}

function ybookmarks_Options_oncommand_modifiers(list, elmId) {
    //keep selected index to default one
    if(document.getElementById("pref-ybookmarks-original-keybindings-remap-checkbox").checked) {
        document.getElementById("pref-ybookmarks-keybindings-add-modifiers-list").selectedIndex = 0;
        document.getElementById("pref-ybookmarks-keybindings-sidebar-modifiers-list").selectedIndex = 0;
    }

    var elm = document.getElementById(elmId); 
    elm.disabled = (list.selectedIndex == 2)? true : false; 
    gKeyMapChanged = true;
    
    ybookmarks_Options_validateShortcuts();
}

function ybookmarks_Options_oninput_textbox(tBox) {
    ybookmarks_options_allowAlphabets(tBox);
    gKeyMapChanged = true;
    ybookmarks_Options_validateShortcuts();
}

function ybookmarks_Options_validateShortcuts() {
    var prefs = [
      "pref-ybookmarks-keybindings-add-textbox",
      "pref-ybookmarks-keybindings-add-modifiers-list",
      "pref-ybookmarks-keybindings-sidebar-textbox",
      "pref-ybookmarks-keybindings-sidebar-modifiers-list",
      "pref-ybookmarks-keybindings-delBookmarkPage-textbox",
      "pref-ybookmarks-keybindings-delBookmarkPage-modifiers-list",
      "pref-ybookmarks-keybindings-delSidebar-textbox",
      "pref-ybookmarks-keybindings-delSidebar-modifiers-list",
      "pref-ybookmarks-keybindings-bookmarksOnDelicious-textbox",
      "pref-ybookmarks-keybindings-bookmarksOnDelicious-modifiers-list",
      "pref-ybookmarks-keybindings-jumpToTag-textbox",
      "pref-ybookmarks-keybindings-jumpToTag-modifiers-list"
    ];
    
    var dup = false;
    var lastcombs = [];
    
    for(var i = 0; i < prefs.length; i+=2) {
        var comb = document.getElementById(prefs[i]).value + gOptionsArr[document.getElementById(prefs[i+1]).selectedIndex];
        
        if(lastcombs.indexOf(comb) != -1) {
            dup = true;
        }
        lastcombs.push(comb);
    }
    
    if(dup) {
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
        var strings = document.getElementById( "ybookmarks-option-strings" ); 
        var dialogTitleStr=strings.getString("extensions.ybookmarks.cookies.dialogTitle");
        var dialogInfoStr=strings.getString("extensions.ybookmarks.shortcuts.duplicateKeys");

        promptService.alert(window, dialogTitleStr, dialogInfoStr);
    }
}

function ybookmarks_Options_savePrefs() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		                .getService(Components.interfaces.nsIPrefBranch);
	var prefArr = [
	  "pref-ybookmarks-original-keybindings-remap",
      "pref-ybookmarks-keybindings-add",
      "pref-ybookmarks-keybindings-add-modifiers",
      "pref-ybookmarks-keybindings-sidebar",
      "pref-ybookmarks-keybindings-sidebar-modifiers",
      "pref-ybookmarks-keybindings-delBookmarkPage",
      "pref-ybookmarks-keybindings-delBookmarkPage-modifiers",
      "pref-ybookmarks-keybindings-delSidebar",
      "pref-ybookmarks-keybindings-delSidebar-modifiers",
      "pref-ybookmarks-keybindings-bookmarksOnDelicious",
      "pref-ybookmarks-keybindings-bookmarksOnDelicious-modifiers",
      "pref-ybookmarks-keybindings-jumpToTag",
      "pref-ybookmarks-keybindings-jumpToTag-modifiers"
	];
	
	var chkBox = document.getElementById(prefArr[0]+"-checkbox");
	
    for(var i = 0; i < prefArr.length; i++) {
        if(i == 0) {
            prefs.setBoolPref(document.getElementById(prefArr[i]).name, (!chkBox.checked));
        } else {
            if(i%2 == 1) {
                prefs.setCharPref(document.getElementById(prefArr[i]).name, document.getElementById(prefArr[i]+"-textbox").value);
            }
            if(i%2 == 0) {
                prefs.setCharPref(document.getElementById(prefArr[i]).name, gOptionsArr[document.getElementById(prefArr[i]+"-list").selectedIndex]);
            }
        }
    }        
}

function ybookmarks_Options_askForRestart() {
	if(gKeyMapChanged == true) {
	    //Explicitly save all the preferences
	    ybookmarks_Options_savePrefs();
	    
		//This is the variable hack to pass data between a dialog and its parent.
		//reqRestart dialog sets access _userSelection using window.opener._userSelection
		_userSelection = "cancel";		
		window.openDialog( "chrome://ybookmarks/content/reqRestart.xul",
                       "reqRestart",
                       "chrome,dialog,centerscreen,modal,resizable=no" );
        if(_userSelection == "restart") {  
           _userSelection = "cancel";
           	ybookmarksUtils._quit(true);
        }
	}
	
	return true;
}

function ybookmarks_Options_shortcutsOnRestoreDefaults() {
    try {
        var options = new Array("accel", "accel,shift", "none");
        var prefs = [
          "pref-ybookmarks-original-keybindings-remap",
          "pref-ybookmarks-keybindings-add",
          "pref-ybookmarks-keybindings-add-modifiers",
          "pref-ybookmarks-keybindings-sidebar",
          "pref-ybookmarks-keybindings-sidebar-modifiers",
          "pref-ybookmarks-keybindings-delBookmarkPage",
          "pref-ybookmarks-keybindings-delBookmarkPage-modifiers",
          "pref-ybookmarks-keybindings-delSidebar",
          "pref-ybookmarks-keybindings-delSidebar-modifiers",
          "pref-ybookmarks-keybindings-bookmarksOnDelicious",
          "pref-ybookmarks-keybindings-bookmarksOnDelicious-modifiers",
          "pref-ybookmarks-keybindings-jumpToTag",
          "pref-ybookmarks-keybindings-jumpToTag-modifiers"
        ];
        

        var chkBox = "pref-ybookmarks-original-keybindings-remap-checkbox";

        var elms = [
          chkBox,
          "pref-ybookmarks-keybindings-add-textbox",
          "pref-ybookmarks-keybindings-add-modifiers-list",
          "pref-ybookmarks-keybindings-sidebar-textbox",
          "pref-ybookmarks-keybindings-sidebar-modifiers-list",
          "pref-ybookmarks-keybindings-delBookmarkPage-textbox",
          "pref-ybookmarks-keybindings-delBookmarkPage-modifiers-list",
          "pref-ybookmarks-keybindings-delSidebar-textbox",
          "pref-ybookmarks-keybindings-delSidebar-modifiers-list",
          "pref-ybookmarks-keybindings-bookmarksOnDelicious-textbox",
          "pref-ybookmarks-keybindings-bookmarksOnDelicious-modifiers-list",
          "pref-ybookmarks-keybindings-jumpToTag-textbox",
          "pref-ybookmarks-keybindings-jumpToTag-modifiers-list"
        ];

        for( var i = 0; i < prefs.length; i++) {
   	        var pref = document.getElementById(prefs[i]);
            
            if(i == 0) {
                document.getElementById(elms[i]).checked = false;
            } else {
                if(i%2 == 1) {                    
                    document.getElementById(elms[i]).value = getYBDefaultValue(pref);                    
                    if(document.getElementById(elms[i]).disabled) document.getElementById(elms[i]).disabled = false;
                }
                
                if(i%2 == 0) {                    
                    document.getElementById(elms[i]).selectedIndex = options.indexOf(getYBDefaultValue(pref));
                }
            }
            
            gKeyMapChanged = true;
        }
        
        var key1 = document.getElementById("pref-ybookmarks-keybindings-add-textbox");
        var mod1 = document.getElementById("pref-ybookmarks-keybindings-add-modifiers-list");
        key1.removeAttribute("readonly");
        mod1.removeAttribute("readonly");
            
        
        var key2 = document.getElementById("pref-ybookmarks-keybindings-sidebar-textbox");
        var mod2 = document.getElementById("pref-ybookmarks-keybindings-sidebar-modifiers-list");
        key2.removeAttribute("readonly");
        mod2.removeAttribute("readonly");
    } catch(e) {
        yDebug.print("options.js:ybookmarks_Options_shortcutsOnRestoreDefaults()=>Exception: "+e,YB_LOG_MESSAGE);
    }    

}

function ybookmarks_options_allowAlphabets(tBox)
{
    //allow only A-Z characters and convert a-z to caps if inserted
	if(tBox.value.charCodeAt(0) >= 97 && tBox.value.charCodeAt(0) <= 122) {
		tBox.value = tBox.value.toUpperCase();
	} else if (tBox.value.charCodeAt(0) >= 65 && tBox.value.charCodeAt(0) <= 90) {
	    // do nothing
	} else {
	    tBox.value = "";
	}
}

function ybookmarksOptionsToggleAwesomeBarIntegration(chkBox) {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		                .getService(Components.interfaces.nsIPrefBranch);
    if(!chkBox.checked) {
        document.getElementById("pref-ybookmarks-awesomebar-delicious-search-checkbox").checked = true;
        prefs.setBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousSearch", true);
        document.getElementById("pref-ybookmarks-awesomebar-only-delicious-search-checkbox").checked = true;
        prefs.setBoolPref("extensions.ybookmarks@yahoo.awesomebar.showOnlyDeliciousSearch", true);
        document.getElementById("pref-ybookmarks-awesomebar-delicious-tags-checkbox").checked = true;
        prefs.setBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousTags", true);
    } else {
        document.getElementById("pref-ybookmarks-awesomebar-delicious-search-checkbox").checked = false;
        prefs.setBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousSearch", false);
        document.getElementById("pref-ybookmarks-awesomebar-only-delicious-search-checkbox").checked = false;
        prefs.setBoolPref("extensions.ybookmarks@yahoo.awesomebar.showOnlyDeliciousSearch", false);
        document.getElementById("pref-ybookmarks-awesomebar-delicious-tags-checkbox").checked = false;
        prefs.setBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousTags", false);
    }
}

function ybookmarksOptionsCheckAwesomeBarIntegration() {
  var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		                .getService(Components.interfaces.nsIPrefBranch);

  if(document.getElementById("pref-ybookmarks-awesomebar-delicious-search-checkbox").checked
    || document.getElementById("pref-ybookmarks-awesomebar-only-delicious-search-checkbox").checked
    || document.getElementById("pref-ybookmarks-awesomebar-delicious-tags-checkbox").checked) {
    document.getElementById("pref-ybookmarks-awesomebar-integration-enable").checked = true;
  } else {
    document.getElementById("pref-ybookmarks-awesomebar-integration-enable").checked = false;
  }
  
   
  if(gybAwesomeBarOptionsFlags.length == 0) {
      gybAwesomeBarOptionsFlags[0] = document.getElementById("pref-ybookmarks-awesomebar-delicious-search-checkbox").checked;
      gybAwesomeBarOptionsFlags[1] = document.getElementById("pref-ybookmarks-awesomebar-only-delicious-search-checkbox").checked;
      gybAwesomeBarOptionsFlags[2] = document.getElementById("pref-ybookmarks-awesomebar-delicious-tags-checkbox").checked;
      gybAwesomeBarOptionsFlags[3] = prefs.getCharPref("extensions.ybookmarks@yahoo.awesomebar.deliciousSearchOrderBy");
      gybAwesomeBarOptionsFlags[4] = prefs.getIntPref("extensions.ybookmarks@yahoo.awesomebar.maxRowsInDeliciousSearch");
      gybAwesomeBarOptionsFlags[5] = prefs.getIntPref("extensions.ybookmarks@yahoo.awesomebar.maxHistoryRows");
      document.getElementById("pref-ybookmarks-awesomebar-orderby").value = gybAwesomeBarOptionsFlags[3];
      document.getElementById("pref-ybookmarks-awesomebar-max-result-rows").value = gybAwesomeBarOptionsFlags[4];
      document.getElementById("pref-ybookmarks-awesomebar-max-history-rows").value = gybAwesomeBarOptionsFlags[5];
  }
}

function ybookmarks_Options_restoreChangedOptions() {
    if(ybookmarksUtils.getPlatform() === "win") {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		                    .getService(Components.interfaces.nsIPrefBranch);
        prefs.setBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousSearch", gybAwesomeBarOptionsFlags[0]);
        prefs.setBoolPref("extensions.ybookmarks@yahoo.awesomebar.showOnlyDeliciousSearch", gybAwesomeBarOptionsFlags[1]);
        prefs.setBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousTags", gybAwesomeBarOptionsFlags[2]);
        prefs.setCharPref("extensions.ybookmarks@yahoo.awesomebar.deliciousSearchOrderBy", gybAwesomeBarOptionsFlags[3]);
        prefs.setIntPref("extensions.ybookmarks@yahoo.awesomebar.maxRowsInDeliciousSearch", gybAwesomeBarOptionsFlags[4]);
        prefs.setIntPref("extensions.ybookmarks@yahoo.awesomebar.maxHistoryRows", gybAwesomeBarOptionsFlags[5]);
    }
}

function ybookmarksOptionsAwesomebarMaxResultRows() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
	                    .getService(Components.interfaces.nsIPrefBranch);
    var value = document.getElementById("pref-ybookmarks-awesomebar-max-result-rows").value;
    
    if(!value) {
        prefs.setIntPref("extensions.ybookmarks@yahoo.awesomebar.maxRowsInDeliciousSearch", gybAwesomeBarOptionsFlags[4]);
        return;
    }
    
    if(value > 0 && value < 21) {
        prefs.setIntPref("extensions.ybookmarks@yahoo.awesomebar.maxRowsInDeliciousSearch", value);
    } else {
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
        var strings = document.getElementById( "ybookmarks-option-strings" ); 
        var dialogTitleStr=strings.getString("extensions.ybookmarks.awesomebarmaxrows.dialogTitle");
        var dialogInfoStr=strings.getString("extensions.ybookmarks.awesomebarmaxrows.dialogInfo");

        promptService.alert(window, dialogTitleStr, dialogInfoStr);
        document.getElementById("pref-ybookmarks-awesomebar-max-result-rows").value = gybAwesomeBarOptionsFlags[4];
        document.getElementById("pref-ybookmarks-awesomebar-max-result-rows").focus();
    }
}

function ybookmarksOptionsAwesomebarMaxHistoryRows() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
	                    .getService(Components.interfaces.nsIPrefBranch);
    var value = document.getElementById("pref-ybookmarks-awesomebar-max-history-rows").value;
    
    if(!value) {
        prefs.setIntPref("extensions.ybookmarks@yahoo.awesomebar.maxHistoryRows", gybAwesomeBarOptionsFlags[5]);
        return;
    }
    
    if(value > 0 && value < 21) {
        prefs.setIntPref("extensions.ybookmarks@yahoo.awesomebar.maxHistoryRows", value);
    } else {
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
        var strings = document.getElementById( "ybookmarks-option-strings" ); 
        var dialogTitleStr=strings.getString("extensions.ybookmarks.awesomebarmaxrows.dialogTitle");
        var dialogInfoStr=strings.getString("extensions.ybookmarks.awesomebarmaxrows.dialogInfo");

        promptService.alert(window, dialogTitleStr, dialogInfoStr);
        document.getElementById("pref-ybookmarks-awesomebar-max-history-rows").value = gybAwesomeBarOptionsFlags[5];
        document.getElementById("pref-ybookmarks-awesomebar-max-history-rows").focus();
    }
}

function ybookmarksOptionsAwesomeBarOrderBy(radio) {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
	                    .getService(Components.interfaces.nsIPrefBranch);
    if(radio.selected) {
        prefs.setCharPref("extensions.ybookmarks@yahoo.awesomebar.deliciousSearchOrderBy", radio.value);
    }
}
