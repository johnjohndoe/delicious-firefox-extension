var YBlog411 = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
var gYBXUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
var YBrdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].
                      getService(Components.interfaces.nsIRDFService);
var YBrdfContainerUtils = Components.classes["@mozilla.org/rdf/container-utils;1"].
                        getService(Components.interfaces.nsIRDFContainerUtils);

var ybookmarks_Main = {

   isMostRecentMenuPopulated: false, 
   isMostFrequentMenuPopulated: false, 
   _bookmark_menu_items: new Array(),

   addBookmarkItemsToMainMenu: function(from) {

    const MENU_SHOW_RECENT_SAVED = 1;
    const MENU_SHOW_RECENT_VIEWED = 2;
    const DEFAULT_SHOW_MENU_COUNT = 20;

    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService).getBranch( "extensions.ybookmarks@yahoo." );

    var menuType = MENU_SHOW_RECENT_SAVED;
  
    try {
      menuType = prefs.getIntPref( "menu.showtype" );
    } catch ( e ) {
    }

    if ( from && from == "new-bookmark-added" && menuType != MENU_SHOW_RECENT_SAVED ) {
      return;
    } else if ( from && from == "bookmark-visited" && menuType != MENU_SHOW_RECENT_VIEWED ) {
      return;
    }

    var menuCount = DEFAULT_SHOW_MENU_COUNT;
    try {
      menuCount = prefs.getIntPref( "menu.showcount" );
    } catch ( e ) {
    }
    
    var order = "descending";
    var column = null;
    if (menuType == MENU_SHOW_RECENT_SAVED ) {
      column = "bookmark-sort-tree-adddate-col";
    } else {
      column = "bookmark-sort-tree-visitdate-col";
    }

    var bookmarks = ybookmark_Utils.getSortedBookmarks ( column, menuCount );
    var menupopup = document.getElementById( "ybookmarks_menu_popup" );

    // remove last few items from the menu popup. The menu items are cached in _bookmark_menu_items
    var totalElements = this._bookmark_menu_items.length;
    for ( var counter = 0; counter < totalElements; ++counter ) {
      menupopup.removeChild ( this._bookmark_menu_items.pop() );
      
    }

    for ( var counter = 0; counter < bookmarks.length; ++counter ) {

      var bookmark = bookmarks[ counter ];

      var menuitem = ybookmark_Utils.createMenuItem( bookmark.name, "", "", "" );
      menuitem.setAttribute( "id", bookmark.id );
      menuitem.setAttribute( "type", bookmark.type );
      menuitem.setAttribute( "url", bookmark.url );
      menuitem.setAttribute( "statustext", bookmark.url );
      menuitem.setAttribute( "image", bookmark.icon );
      menupopup.appendChild ( menuitem );
      this._bookmark_menu_items.push ( menuitem );
    }
    
    var menuitem = document.getElementById("ybookmarks_bookmarks_type");
    if (menuType == MENU_SHOW_RECENT_SAVED) {
      menuitem.setAttribute("label", menuitem.getAttribute("label1"));
      menuitem.setAttribute("tooltip", menuitem.getAttribute("tooltip1"));
    }
    else if (menuType == MENU_SHOW_RECENT_VIEWED) {
      menuitem.setAttribute("label", menuitem.getAttribute("label2"));
      menuitem.setAttribute("tooltip", menuitem.getAttribute("tooltip2"));
    }

   },

   /**
    * @param sortBy either by last_added or most_visited
    */
   addBookmarksToPopup: function(popupElement, sortBy ) {

    while ( popupElement.firstChild ) { popupElement.removeChild ( popupElement.firstChild ); }
    
    var bookmarks = null;
    
    var sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
					  getService(Components.interfaces.nsIYDelLocalStore);
					  
    if(sortBy == "last_added") {
        bookmarks = sqliteStore.getRecentBookmarks( 15, {} );
    } else {
        bookmarks = sqliteStore.getMostVisitedBookmarks( 15, {} );
    }

    var counter = 0;
    for ( ; counter < bookmarks.length; ++counter ) {

      var bookmark = bookmarks[ counter ];
      var menuitem = ybookmark_Utils.createMenuItem( bookmark.name, "", "", "" );
      menuitem.setAttribute( "id", bookmark.id );
      menuitem.setAttribute( "type", bookmark.type );
      menuitem.setAttribute( "url", bookmark.url );
      menuitem.setAttribute( "statustext", bookmark.url );
      menuitem.setAttribute( "image", bookmark.icon );
      menuitem.setAttribute( "oncommand", "if (event.target == this) { ybookmarksUtils.openBookmark(event); }");
      menuitem.setAttribute( "onclick", "if (event.target == this && event.button == 1) { ybookmarksUtils.openBookmark(event); }");
/* ******* leaving this checked in, as it can be turned on quickly *******
      if( bookmark.shared == "false" ) {
        menuitem.setAttribute( "class", menuitem.getAttribute( "class" ) + " private-bookmark" );
      }
*/
      popupElement.appendChild ( menuitem );
    }

    if ( counter == 0 ) {
      ybookmark_Utils.addEmptyMenuItem( popupElement );
    }
     
    YBtabsOpener.addMenuItem( popupElement );
    return counter;
   },

   SearchBookmarks: function() {
    try {

      //If classic dont do anything
      if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)  {
      	return true;
      }   
      
      var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                          getService(Components.interfaces.nsIPrefBranch);                             
      var keepSidebarOpened = prefs.getBoolPref("extensions.ybookmarks@yahoo.sidebar.keep_opened");
      if (keepSidebarOpened) {
        toggleSidebar('viewYBookmarksSidebar', true);
        var panel = document.getElementById("sidebar").contentDocument.getElementById("ybSidebarPanel");
        panel.setSearchBoxFocus();

      } else {
        toggleSidebar('viewYBookmarksSidebar');
      }
    } catch (e) {
      yDebug.print("SearchBookmarks(): " + e);
    }
   
  },

  addTagsToMenu: function(event) {
    
    var type = event.target.getAttribute("type");
    if ( type != "main" ) {
      return;
    }

    /*var tagPopups = [ "ybookmarks_tags_menu_1", "ybookmarks_tags_menu_2", 
                      "ybookmarks_tags_menu_3", "ybookmarks_tags_menu_4",
                      "ybookmarks_tags_menu_5" 
                    ];
    var popularTags = ybookmark_Utils.getPopularTags();

    // hide everything now
    for ( var index = 0; index < tagPopups.length; ++index ) {
      document.getElementById ( tagPopups[ index ] ).setAttribute ( "hidden", "true" );
    }

    for (var tagIndex = 0; tagIndex < tagPopups.length && tagIndex < popularTags.length; ++tagIndex) {
      var menu = document.getElementById ( tagPopups[tagIndex] );
      menu.setAttribute ( "label", popularTags[ tagIndex ] );
      menu.setAttribute ( "hidden", "false" );

      var resourceName = ybookmarksMain.gBookmarks.getTagResourceName ( popularTags[ tagIndex ] );
      menu.setAttribute( "ref", resourceName );
      menu.builder.rebuild();
    }
    */
    
    
    /* bags */
    /*var bagPopups = [ "ybookmarks_bags_menu_1", "ybookmarks_bags_menu_2", 
                      "ybookmarks_bags_menu_3", "ybookmarks_bags_menu_4",
                      "ybookmarks_bags_menu_5" 
                    ];
    var bags = ybBags.getBags();
    
    // hide everything now
    for ( var index = 0; index < bagPopups.length; ++index ) {
      document.getElementById ( bagPopups[ index ] ).setAttribute ( "hidden", "true" );
    }

    for (var bagIndex = 0; bagIndex < bagPopups.length && bagIndex < bags.length; ++bagIndex) {
      var menu = document.getElementById ( bagPopups[bagIndex] );
      menu.setAttribute ( "label", bags[ bagIndex ].tags.join(" ") );
      menu.setAttribute ( "hidden", "false" );

      var resourceName = ybookmarksMain.gBookmarks.getTagResourceName ( bags[ bagIndex ].tags[0] ); // cmyang:: hack
      menu.setAttribute( "ref", resourceName );
      menu.builder.rebuild();
    }
    */
  },

  addEmptyMenuItem: function(event) {
    var target = event.originalTarget;
    if ( target.nodeName == "menu" ) {
      target = target.firstChild
    }

    if (target.nodeName == "menupopup" && !target.hasChildNodes()) {
      ybookmark_Utils.addEmptyMenuItem( event.originalTarget );
    }
  },
  
  addPopularPageMenuItem : function(target) {
    //var target = event.target;
    var XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    var bundle = document.getElementById( "ybookmarks-strings" );

    var items = target.getElementsByAttribute("class", "popular-page-separator");    
    if (items.length == 0 && target.firstChild) {
      var menuseparator = document.createElementNS(XULNS, "menuseparator");
      menuseparator.setAttribute("class", "popular-page-separator")
      target.insertBefore(menuseparator, target.firstChild);
    }

    var items = target.getElementsByAttribute("class", "popular-page-item");
    if (items.length == 0 && target.firstChild) {
      var menuitem = document.createElementNS(XULNS, "menuitem");
      var label = target.parentNode.getAttribute("label");
      menuitem.setAttribute("label", bundle.getFormattedString("extensions.ybookmarks.menu.popular.page", 
         [label]));
      menuitem.setAttribute("class", "popular-page-item");
      menuitem.setAttribute("tag", label);
      menuitem.setAttribute("oncommand", "ybookmarks_Main.openPopularPageForTag(event);");
      menuitem.setAttribute("onclick", "if (event.button == 1) { ybookmarks_Main.openPopularPageForTag(event); }");
      target.insertBefore(menuitem, target.firstChild);
    }
  },
  
  openPopularPageForTag : function(event) {
     var tag = event.target.getAttribute("tag");
     if (tag) {
       var url = deliciousService.getUrl("popular/" + tag);
       var where = whereToOpenLink(event);
       if (event.button == 1)
         ybBookmarksMenu.closeMenuPopup(event.target)
       openUILinkIn(url, where);
     }
  }
};

var YBonMenuTypePrefChanged = {
  observe: function ( subject, topic, data ) {

    if ( topic != "nsPref:changed" ) {
      return;
    }

    if ( data == "extensions.ybookmarks@yahoo.menu.showcount" ||
         data == "extensions.ybookmarks@yahoo.menu.showtype" 
       ) {
      ybookmarksMain.isBookmarkChanged = true;
    }
  }
};

