var gYBTwitterAuthWindow = null;
var twitteroAuthURL = "http://beta.delicious.bz/settings/bookmarks/sharing/twitter";

var YBTwitterAuthWindow = {
  
  openAuthWindow: function () {
    if(gYBTwitterAuthWindow) {
        gYBTwitterAuthWindow.close();
    }
    //TODO:Put correct params.
    gYBTwitterAuthWindow = ybookmarksUtils.openWindow(twitteroAuthURL, "", 850, 400);
    gYBTwitterAuthWindow.focus();
    //subscribe to cookie changes notification
    Components.classes[ "@mozilla.org/observer-service;1" ].
      getService( Components.interfaces.nsIObserverService ).
      addObserver( YBTwitterAuthWindow, "cookie-changed", false ); 
  },
  
  observe: function(subject, topic, data) {
    //after getting the success cookie, TODO:Validate success cookie
    if( data == "added" || data == "changed") {
        var cookie = subject.QueryInterface ( Components.interfaces.nsICookie );
        if(!cookie) return;
        //yDebug.print("***Cookie host:" + cookie.host + ",name:" + cookie.name,YB_LOG_MESSAGE);
        if( (cookie.host == ybookmarksUtils._DOTCOMHOST) && cookie.name == DEL_XTOAUthCookie ) {
          try {
            if(gYBTwitterAuthWindow) {
                gYBTwitterAuthWindow.close();
            }
            var obsService = Components.classes["@mozilla.org/observer-service;1"].
                   getService(Components.interfaces.nsIObserverService);
            obsService.notifyObservers(null, "ybookmark.twitterAuth.Success", cookie.value);
            obsService.removeObserver( YBTwitterAuthWindow, "cookie-changed" );
          } catch(e) {
              yDebug.print("Exception in YBTwitterAuthWindow::observe:" + e);
          }
        }
    }
  }
};