var gYBObservService = null;
var gYBLoginWindow = null;

var YBPopupWindow = {
	
   observe: function(subject, topic, data) {
      if ( data == "loggedin" ) {
         try {                        
           if ( gYBLoginWindow ) {
              try { 
                gYBLoginWindow.close();
              } catch (e) {
                //do nothing
              } finally {
                gYBLoginWindow = null;
                this.unsubscribeToCookieChange();
              }
           }            
         } catch ( e ) {}//ignore
      }
   },
   
	openURL: function(aUrl, aTitle, aWidth, aHeight) {
	  this.subscribeToCookieChange();
	  // yes, it's hacky.  yes, it works.
	  try {
	    //gYBLoginWindow.location.href = aUrl;
	    gYBLoginWindow.close();
	    gYBLoginWindow = ybookmarksUtils.openWindow(aUrl, aTitle, aWidth, aHeight);
	  } catch (e) {
	    gYBLoginWindow = ybookmarksUtils.openWindow(aUrl, aTitle, aWidth, aHeight);
	  } finally {
	    gYBLoginWindow.focus();
	  } 
	},
	
	subscribeToCookieChange: function() {
   		gYBObservService = Components.classes["@mozilla.org/observer-service;1"].
   					getService( Components.interfaces.nsIObserverService);
   		gYBObservService.addObserver( YBPopupWindow, "ybookmark.userChanged", false ); 
   		
	},
	
	unsubscribeToCookieChange: function() {
   		gYBObservService = Components.classes["@mozilla.org/observer-service;1"].
   					getService( Components.interfaces.nsIObserverService);
   		gYBObservService.removeObserver( YBPopupWindow, "ybookmark.userChanged" ); 
	},
	
	showLoginWindow: function() {
	    var bundle = document.getElementById( "strbndl_idManager");    
	    var title = bundle.getString("extensions.ybookmarks.login.page.title");
	  	this.openURL( deliciousService.getLoginWindowUrl(), title, 550, 550 );
	}
};

