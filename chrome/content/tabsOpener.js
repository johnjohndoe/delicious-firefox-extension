var YBtabsOpener = {
  addMenuItem: function( menu ) {
    var i, nBookmarks = 0;
    for( i = 0; ( i < menu.childNodes.length ) && ( nBookmarks < 2 ); ++i ) {
      if( menu.childNodes[ i ].nodeName != "menuseparator" && 
          menu.childNodes[ i ].hasAttribute( "url" ) ) {
            ++nBookmarks;
          }
    }
    if( ( nBookmarks == 2 ) && ( menu.lastChild.getAttribute( "yb_tabsOpener" ) != "true" ) ) {
      var elt = document.createElement( "menuseparator" );
      menu.appendChild( elt );
      elt = document.createElement( "menuitem" );
      var bundle = document.getElementById( "ybookmarks-strings" );
      elt.setAttribute( "label", 
                        bundle.getString( 
                          "extensions.ybookmarks.toolbar.container.context.openintabs.label" ) );
      elt.setAttribute( "oncommand", "YBtabsOpener.open(this.parentNode);" );
      elt.setAttribute( "onclick", "if (event.button==1) {YBtabsOpener.open(this.parentNode); }" );  
      elt.setAttribute( "class", YB_MENUITEM_NOICON);      
      elt.setAttribute( "yb_tabsOpener", "true" );
      menu.appendChild( elt );
    }
  },

  open: function( menu ) {
    var i, item;
    var urls = new Array();
    for( i = 0; i < menu.childNodes.length; ++i ) {
      item = menu.childNodes[ i ];
      if( ( item.nodeName != "menuseparator" ) && item.hasAttribute( "url" ) &&
          ( item.getAttribute( "yb_tabsOpener" ) != "true" ) ) {
            urls.push( item.getAttribute( "url" ) );
          }
    }
    //this.openURLs( urls );
    this.openURLsInNewTab( urls );    
  },

  openURLs: function( urls ) {
    var windowManager = ( Components.classes[ "@mozilla.org/appshell/window-mediator;1" ] ).getService();
    var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator );
    var browser = ( windowManagerInterface.getMostRecentWindow( "navigator:browser" ) ).getBrowser();
    var tabs = browser.tabContainer.childNodes;
    var i, nBookmarksOpened = 0, nExistingTabs = tabs.length;

    var replaceTabs = true;
    try {
      var prefs = 
        Components.classes[ "@mozilla.org/preferences-service;1" ].getService(
          Components.interfaces.nsIPrefBranch );
      replaceTabs = prefs.getBoolPref( "browser.tabs.loadFolderAndReplace" );
    } 
    catch( e ) { 
      yDebug.print( "exception while getting loadFolderAndReplace: " + e, YB_LOG_MESSAGE );
    }

    if( !replaceTabs ) {
      nExistingTabs = 0;
    }

    for( i = 0; i < urls.length; ++i ) {
      if( nBookmarksOpened < nExistingTabs ) {
        browser.selectedTab = tabs[ nBookmarksOpened ];
        browser.loadURI( urls[ i ] );
      }
      else {
        browser.addTab( urls[ i ] );
      }
      ++nBookmarksOpened;
    }
    if( replaceTabs ) {
      if( nBookmarksOpened < nExistingTabs ) {  // need to close extra tabs
        for( i = 0; i < nExistingTabs - nBookmarksOpened; ++i ) {
          browser.removeTab( browser.tabContainer.lastChild );
        }
      }
    }
    // setting focus to first opened bookmark 
    browser.selectedTab = tabs[ tabs.length - nBookmarksOpened ];
  },
  
  openURLsInNewTab: function (urls) {
  	var windowManager = ( Components.classes[ "@mozilla.org/appshell/window-mediator;1" ] ).getService();
    var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator );
    var browser = ( windowManagerInterface.getMostRecentWindow( "navigator:browser" ) ).getBrowser();
    var i;

    for( i = 0; i < urls.length; ++i ) {
        browser.addTab( urls[ i ] );
    }
  }
};
