var YB_TYPE_TAG = "Tag";
var YB_TYPE_LIVEMARK = "Livemark";
var YB_TYPE_BOOKMARK = "Bookmark";
var YB_TYPE_BUNDLE = "Bundle";

var ybBookmarksMenu = {
  
  _rdfService : null,
  
  _sqliteStore : null,
  
  _socialStore : null,
  
  _syncService : null,
  
  _prefs: null,
  
  onLoad: function () {
    try {
      this._rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].
                          getService(Components.interfaces.nsIRDFService);
      
      this._sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
				          getService(Components.interfaces.nsIYDelLocalStore);
 
      this._socialStore = Components.classes["@yahoo.com/socialstore/delicious;1"].
                            getService(Components.interfaces.nsISocialStore); 

      this._syncService = Components.classes["@mozilla.org/ybookmarks-sync-service;1"].
                           getService(Components.interfaces.nsIYBookmarkSyncService);

      this._prefs = Components.classes["@mozilla.org/preferences-service;1"].
                     getService(Components.interfaces.nsIPrefBranch);

    } catch (e) {
      yDebug.print("ybBookmarksMenu.onLoad(): " + e, YB_LOG_MESSAGE);
    } 
  },
  
  getPrefs: function() {
    if (!this._prefs) {
      this._prefs = Components.classes["@mozilla.org/preferences-service;1"].
                          getService(Components.interfaces.nsIPrefBranch);
    }
    return this._prefs;
  },
  
  createContextMenu: function (aEvent)
  { 
    if (!this._rdfService) {
      this._rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].
                      getService(Components.interfaces.nsIRDFService);
    }
    
    var target = document.popupNode;

    try{ 
      var bookmark = this._sqliteStore.getBookmark(target.getAttribute("url"));
      if (bookmark.type != "Bookmark" && bookmark.type != "Livemark") {
        target.removeAttribute("open");
        return false;
      }
      this._contextMenuEnableOpen(target);    
    }
    catch(e) {
        
      var url = target.getAttribute("url");
      if (!url) {
        target.removeAttribute("open");
        return false;
      }
      this._contextMenuEnableOpen(target);
    }

    // close flyout menu if open...
    if (bookmark.type == "Livemark" && target.firstChild.hidePopup) {
      target.firstChild.hidePopup();
    }
        
    return true;
  },
  
  _contextMenuEnableOpen: function (aMenu) 
  {
    var openInWindow = document.getElementById("yb-bookmarks-context-menu-open-in-window");
    var openInNewWindow = document.getElementById("yb-bookmarks-context-menu-open-in-new-window");
    var openInNewTab = document.getElementById("yb-bookmarks-context-menu-open-in-new-tab");
    var openInTabs = document.getElementById("yb-bookmarks-context-menu-open-in-tabs");
    var refreshLivemark = document.getElementById("yb-bookmarks-context-menu-refresh-livemark");

    var container = aMenu.getAttribute("container");
    var livemark = aMenu.getAttribute("livemark");
    
    if (container || livemark) {
      openInWindow.hidden = true;
      openInNewWindow.hidden = true;
      openInNewTab.hidden = true;
      openInTabs.hidden = false;
      refreshLivemark.hidden = false;

    } else {
      openInWindow.hidden = false;  
      openInNewWindow.hidden = false;
      openInNewTab.hidden = false;
      openInTabs.hidden = true;  
      refreshLivemark.hidden = true;
    }
  },

  destroyContextMenu: function (aEvent)
  {
    if (content)
      content.focus();
    
    //XXX: close the toolbarbutton menupopup in the tag view
    var target = document.popupNode;  
    if (target.nodeName == "menuitem") {
       var parent = target.parentNode;
       while (parent) {       
         if (parent.nodeName == "toolbarbutton") {           
          this.closeMenuPopup(parent);
         break;
         }
         
         parent = parent.parentNode;
       }
     }
  },
  
  editBookmark : function (aEvent) {
  
    var url = document.popupNode.getAttribute("url");
    setTimeout(function(url) { yAddBookMark.open(url); }, 0, url);
  },
  
  deleteBookmark : function (url) {
    try {
	    if (!this._syncService) {
	      this._syncService = Components.classes["@mozilla.org/ybookmarks-sync-service;1"].
	                                 getService(Components.interfaces.nsIYBookmarkSyncService);
	    }
	    
	    if (!this._socialStore) {
	      this._socialStore = Components.classes["@yahoo.com/socialstore/delicious;1"].
	              getService(Components.interfaces.nsISocialStore); 
	    }
	
	
	    if( !YBidManager.isUserLoggedIn() ) {
	       YBidManager.promptUserLogin();
	       return;
	    }
	
	    if (!url) { // menu and toolbar; sidebar passes in the url
	      var target = document.popupNode;
	      url = target.getAttribute("url");
	      this.destroyContextMenu();
	    }
	    
	    var warnCheck = this.getPrefs().getBoolPref("extensions.ybookmarks@yahoo.bookmark.delete.warn");
	    if (warnCheck) {
	      var strings = document.getElementById("ybookmarks-strings");
	      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
	             getService(Components.interfaces.nsIPromptService);
	      var text = strings.getString("extensions.ybookmarks.bookmark.delete.text");
	      var warn = strings.getString("extensions.ybookmarks.bookmark.delete.warn");
	      var warnCheck = { value: true };
	    
	      var deleteConfirmed = promptService.confirmCheck(window, "Delicious", text, warn, warnCheck);
	
	      if (!warnCheck.value) {
	        this.getPrefs().setBoolPref("extensions.ybookmarks@yahoo.bookmark.delete.warn", false);
	      }
	      
	      if (!deleteConfirmed) {
	        return;
	      }
	  
	    }
	    	    
	    this._sqliteStore.deleteBookmark(url);
	    
	    this._sqliteStore.addTransaction("deleteBookmark", 0, "bookmark", YBJSON.stringify({url: url}));
	    this._syncService.processTransactions();
	    var os = Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService);         
        os.notifyObservers(null, "ybookmark.updateTagIcon", null);
    }
    catch(e) {
    	yDebug.print("ybmenus.js:ybBookmarksMenu::deleteBookmark - Exception: "+e, YB_LOG_MESSAGE);
    }
  },

   isBookmarksContainer: function (aTarget) {
    return aTarget.localName == "menu"          || 
           aTarget.localName == "toolbarbutton" &&
           aTarget.getAttribute("type") == "menu";
   },
   
   closeMenuPopup: function (aNode) {
     
     var parent = aNode;
     while (parent) {
       if (this.isBookmarksContainer(parent))
         break;
       parent = parent.parentNode;
     }
     if (parent && parent.getAttribute("open") == "true") {
       if(parent.lastChild.nodeName != "template") {
         parent.lastChild.hidePopup();
       }
       var mParentNode = parent.parentNode;
       while (mParentNode) {
         if (this.isBookmarksContainer(mParentNode))
           break;
         mParentNode = mParentNode.parentNode;
       }  
       if (mParentNode)
         this.closeMenuPopup(mParentNode);
     }
   },

   newBookmark: function( event ) {
      yAddBookMark.open( "", "", null, null, null, null, true );
   },

   refreshLivemark: function() {
      ybookmarksMain.gBookmarks.reloadLivemark(document.popupNode.getAttribute("url"));
   },
   
   
    /**
      * Create the menuitem used for the toolbars and the del.icio.us menu.  It accepts an object that contains 
      * the relevent info (name, url, etc).
      *
      * Universal
      * ---------
      * type: YB_TYPE_TAG | YB_TYPE_LIVEMARK | YB_TYPE_BUNDLE
      * name : string
      * url: string
      *
      * Optional
      * --------
      * icon: icon resource
      * bundle: boolean - whether it's a bundle menu or not
      * overflow: boolean - whether it's an overflow menu or not, and to use bookmarks accordingly
      *     bookmarks : array of bookmarks - used for caching overflows
      * menubar: boolean - indicates if this is for the the del menu
      * favoriteTag: boolean - indicates whether is a favorite tag
      * livemark : boolean - indicates if is a bookmark coming off of a livemark
      * order: the order of the menu
      *
      * Returns a menu or menuitem depending on the paramemters
      */
     createMenuItem: function(aItem) {
       var menuItem;
       if (aItem.type == YB_TYPE_TAG || aItem.type == YB_TYPE_LIVEMARK || aItem.type == YB_TYPE_BUNDLE || aItem.type == "Livemark") {
         menuItem = document.createElementNS(gYBXUL_NS, "menu");
         menuItem.setAttribute("container", true);
         var popup = document.createElement("menupopup");

         if (aItem.type == YB_TYPE_LIVEMARK || aItem.type == "Livemark") {
           menuItem.setAttribute("livemark", true);
           menuItem.setAttribute("class", "menu-iconic bookmark-item");
           popup.setAttribute("onpopupshowing", "if (event.target == this) { ybBookmarksMenu.createLivemarkMenu(event.target); }");
           popup.setAttribute("onpopuphiding", "if (event.target == this) { ybBookmarksMenu.destroyLivemarkMenu(event); }");
         } else if (aItem.type == YB_TYPE_TAG) {
           menuItem.setAttribute("class", "menu-iconic yb-tag-item");
           popup.setAttribute("onpopupshowing", "if (event.target == this) { ybBookmarksMenu.createTagMenu(event.target); }");
           popup.setAttribute("onpopuphiding", "if (event.target == this) { ybBookmarksMenu.destroyTagMenu(event); }");
           if (aItem.bundle) {
             menuItem.setAttribute("bundle", true);
           } else if (aItem.overflow) {
             menuItem.setAttribute("overflow", true);
             menuItem.bookmarks = aItem.bookmarks;
           }
           
           if (aItem.menubar) {
             popup.setAttribute("onpopupshowing", "if (event.target == this) { ybBookmarksMenu.createTagMenu(event.target); ybookmarks_Main.addPopularPageMenuItem(event.target);}");
             
           }
           if (aItem.favoriteTag) {
             menuItem.setAttribute("favoriteTag", true);
           }
           
         } else if (aItem.type == YB_TYPE_BUNDLE) {
           menuItem.setAttribute("class", "menu-iconic yb-bundle-item");
           popup.setAttribute("onpopupshowing", "if (event.target == this) { ybBookmarksMenu.createBundleMenu(event.target); }");
           popup.setAttribute("onpopuphiding", "if (event.target == this) { ybBookmarksMenu.destroyBundleMenu(event); }");
         }
         
         menuItem.appendChild(popup);
       } else {
         menuItem = document.createElementNS(gYBXUL_NS, "menuitem");
         menuItem.setAttribute("class", "menuitem-iconic bookmark-item");  
         if (aItem.livemark) {
           menuItem.setAttribute("livemark", true);
         }
         menuItem.setAttribute("oncommand", "if (event.target == this) { ybookmarksUtils.openBookmark(event); }");
         menuItem.setAttribute("onclick", "if (event.target == this && event.button == 1) { ybookmarksUtils.openBookmark(event); }");
         if (ybookmarksUtils.getPlatform() != YB_PLATFORM_MAC) {
           menuItem.setAttribute("context", "yb-bookmarks-context-menu");
         }
       }
       menuItem.setAttribute("label", aItem.name);
       if (aItem.url) {
         menuItem.setAttribute("url", aItem.url );
         menuItem.setAttribute("statustext", aItem.url);
         
       }
       
       //menuItem.setAttribute("tooltip", "ybToolbar-tooltip");

       if (aItem.icon) {
         menuItem.setAttribute("image", aItem.icon);
       }

       menuItem.setAttribute("type", aItem.type);
       
       if (aItem.order != undefined) {
           menuItem.setAttribute("order", aItem.order);
        }
     
     /* ******* leaving this checked in, as it can be turned on quickly *******
         if( aItem.shared == "false" ) {
           menuItem.setAttribute( "class", menuItem.getAttribute( "class" ) + " private-bookmark" );
         }
     */
      return menuItem;
     },

     /*
      * Takes an array of bookmarks and the favorite tag of the menu,
      * then calculate the apporpriate overflow menus
      *
      * Returns [ tagInfo*, topLevel ]
      *
      * tagInfo: { tag: string of tag
      *            bm: [ bookmarks* ] }
      *          Each tagInfo entry represents one overflow menu. tagInfo.bm is used to cache
      *          the contents of the overflow menu by createMenuItem()          
      *
      * topLevel: [ bookmarks ]
      *         topLevel is just an array of the bookmarks that should reside in the toplevel 
      */
     _calcTagMenuOverflow: function(aBookmarks, aTag) {
       try {

        // return bm's tags - omitTags
         var _getTags = function(bm, omitTags) {
           var _arrayContains = function(aArray, aItem){
             for (var i=0; i < aArray.length; i++) {
               if (aArray[i] == aItem) {
                 return true;
               }
             }
             return false;
           };
           var jsTags = ybookmarksUtils.nsArrayToJs(bm.tags);
           var res = [];

           for (var i=0; i < jsTags.length; i++) {
             var tag = jsTags[i].toLowerCase();
             if (!_arrayContains(omitTags, tag)) {
               res.push(tag);  
             }
           }
           return res;
         };

         // make a lookup table of tag->[bookmark+]
         var omitTags = aTag.toLowerCase().split("+");
         var tagsLookup = {};
         
         for (var k=0; k< aBookmarks.length; k++ ) {
           var bm = aBookmarks[k];
           var bmTags = _getTags(bm, omitTags);
           for(var m=0; m <bmTags.length; m++) {
             var t = bmTags[m];
             if (tagsLookup[t]) {
               tagsLookup[t].push(bm);
             } else {
               tagsLookup[t] =  [ bm ];
             }
           }
         }

         // make an array of { tag: String,
         //                     bm: [ bookmarks+ ] }
         var tagsLookupArray = [];
         for (var tag in tagsLookup) {
           tagsLookupArray.push({tag: tag,
                                 bm: tagsLookup[tag]});
         }  
         tagsLookupArray.sort(function(a,b) { 
                               var res = b.bm.length - a.bm.length;
                               if (res == 0) {
                                 res = a.tag.localeCompare(b.tag);
                               }
                               return res;
                             });
         /*
         for (var i=0; i < tagsLookupArray.length; i++) {
           var tag = tagsLookupArray[i];
           yDebug.print("tag: " + tag.tag + " #: " + tag.bm.length);
         }*/

        var maxOverflowMenus = this.getPrefs().getIntPref("extensions.ybookmarks@yahoo.tagsview.overflow.spillover.max"); 
        var minSpilloverSize = this.getPrefs().getIntPref("extensions.ybookmarks@yahoo.tagsview.overflow.spillover.minsize");
        var removeFromTopLevel = this.getPrefs().getBoolPref("extensions.ybookmarks@yahoo.tagsview.overflow.remove_from_toplevel");
       
         var limit = tagsLookupArray.length < maxOverflowMenus ? tagsLookupArray.length : maxOverflowMenus;

         var result = [];
         
         for (var i=0; i < limit; i++) {
           var tag = tagsLookupArray[i];
           if (tag.bm.length >= minSpilloverSize) {
             result.push(tag);
           }
         }
         //var result = tagsLookupArray.slice(0, limit);

         var overflowedDB = {};
         // mark overflowed bookmarks in aBookamrks
         for (var i=0; i < result.length; i++) {
           var bms = result[i].bm;
           for (var j=0; j < bms.length; j++) {
             overflowedDB[bms[j].url] = true;
           }
         }

         if (removeFromTopLevel) {
           var leanBookmarks = [];
           for (var i=0; i< aBookmarks.length; i++ ) {
             var bm = aBookmarks[i];
             if (overflowedDB[bm.url]) {
               continue;
             } else {
               leanBookmarks.push(bm);
             }
           }
           result.push(leanBookmarks);
         } else {
           result.push(aBookmarks);
         }
         return result;

       } catch (e) { 
         yDebug.print("_calcTagMenuOverflow(): " + e);
       }
     },
     
     createTagMenu: function(menu) {
       try {
       var tag = menu.parentNode.getAttribute("label");
       if (!tag) { return; }
       while(menu.childNodes.length > 0) {
         menu.removeChild(menu.childNodes[0]);
       }

       var bookmarks;
       var order;
       if (menu.parentNode.getAttribute("bundle")) {
         order = menu.parentNode.getAttribute("order");
         if(order != undefined) {
            order = ybBags.getSortOrderString(order);
         }
         bookmarks = ybookmark_Utils.getBookmarksForTag(tag, order);
       } else if (menu.parentNode.getAttribute("overflow")){
         bookmarks = menu.parentNode.bookmarks;
         order = menu.parentNode.getAttribute("order");
       } else if (menu.parentNode.getAttribute("favoriteTag")) {
         order = ybBags.getFavoriteTagOrder(tag);
         bookmarks = ybBags.getBookmarksFromFavoriteTag(tag, order);
       } else {
         order = FAVTAGS_ORDER_ALPHANUM;
         bookmarks = ybBookmarksMenu._sqliteStore.getBookmarks(tag, null, "Name", null, {});
       }
       
       if (this.getPrefs().getBoolPref("extensions.ybookmarks@yahoo.tagsview.overflow.enable")) {
         if (bookmarks.length > this.getPrefs().getIntPref("extensions.ybookmarks@yahoo.tagsview.overflow.level") 
             && !menu.parentNode.getAttribute("overflow")) {
          try {
           var overflow = this._calcTagMenuOverflow(bookmarks, tag);

           for (var i=0; i <overflow.length-1; i++) {
             var tagArg = { name: overflow[i].tag,
                               url: "",
                               icon: "",
                               overflow: true,
                               type: YB_TYPE_TAG,
                               order: order,
                               bookmarks: overflow[i].bm};
             var tagItem = this.createMenuItem(tagArg);
             menu.appendChild(tagItem);
           }
           bookmarks = overflow[overflow.length-1];
           } catch (e) {
            yDebug.print("Error calculating tagoverflows: " + e);
           }
         }
      
       }

       for (var i=0; i<bookmarks.length; i++) {
         var bm = bookmarks[i];
         if (bm.type == YB_TYPE_LIVEMARK || bm.type == "Livemark") {
           var newBm = {};
           for (var prop in bm) {
             newBm[prop] = bm[prop];
           }
           newBm.order = order;
           bm = newBm;
           //item.setAttribute("order", "chrono");
         }    
         var bmItem = this.createMenuItem(bm);
         menu.appendChild(bmItem);
       }

       if (bookmarks.length > 1) {
         YBtabsOpener.addMenuItem(menu);
       } else if (bookmarks.length == 0) {
         menu.appendChild(this.createEmptyMenuItem());
       } 
     } catch (e) { 
       yDebug.print("createTagMenu(): " + e, YB_LOG_MESSAGE);
     }
     },

     destroyTagMenu: function(event) {
       if (content) {
         content.focus();
       }
     },
     createLivemarkMenu: function(menu) {
       try {
       var url = menu.parentNode.getAttribute("url");
      
       while(menu.childNodes.length > 0) {
         menu.removeChild(menu.childNodes[0]);
       }
  
       var order = menu.parentNode.getAttribute("order");
       var bookmarks = ybookmarksMain.gBookmarks.getBookmarksForLivemark(url, {});
       ybBags.sortBookmarks(bookmarks, FAVTAGS_ORDER_CHRONO); // this is actually reverse chrono since livemark items are stacked 
       var numItems = 0;

       for (var i=0; i < bookmarks.length; i++) {
         var bm = bookmarks[i];

         var arg = {name: bm.name,
                     url: bm.url,
                     icon: "",
                     type: YB_TYPE_BOOKMARK,
                     livemark: true};
         var bmItem = this.createMenuItem(arg);

         menu.appendChild(bmItem);
      
         numItems++;
       }
       if (numItems > 1) {
         YBtabsOpener.addMenuItem(menu);
       } else if (numItems == 0) {
         menu.appendChild(this.createEmptyMenuItem());
       }
       } catch(e) { yDebug.print(e); }

     },

     destroyLivemarkMenu: function(event) {
       if (content) {
         content.focus();
       }
     },

     createBundleMenu: function(menu) {
       try {
       var bundleName = menu.parentNode.getAttribute("label");
       var bundle = ybookmarksUtils.nsBundleToJs(ybookmarksMain.gBookmarks.getBundle(bundleName));
       var order = menu.parentNode.getAttribute("order");
       var tags = bundle.tags;
       var bundleMenuIncludeBookmarks = this.getPrefs().getBoolPref("extensions.ybookmarks@yahoo.bundles.menu.include_bookmarks");
      
       while(menu.childNodes.length > 0) {
         menu.removeChild(menu.childNodes[0]);
       }
      
       if ( (bundleMenuIncludeBookmarks && tags.length > 1) ||
            (!bundleMenuIncludeBookmarks && tags.length >= 1) ) {    
         for (var i=0; i < tags.length; i++) {
           var tag = tags[i];
           if (tag) {
              if (ybBookmarksMenu._sqliteStore.getTotalBookmarksForTag(tag) > 0) {
               var tagArg = { name: tag,
                              url: "",
                              icon: "",
                              type: YB_TYPE_TAG,
                              bundle: true,
                              order: order};

               var menuitem = this.createMenuItem(tagArg);
               menu.appendChild(menuitem);
             }
           }
         }
       } 

       if (bundleMenuIncludeBookmarks) {
         //menu.appendChild(document.createElementNS(gYBXUL_NS, "menuseparator"));

         var bookmarks = [];
         /*
         for(var i=0; i < tags.length; i++) {
           bookmarks = bookmarks.concat(ybookmark_Utils.getBookmarksForTag(tags[i], order));
         }
         bookmarks = ybookmarksUtils.uniqueBookmarkArray(bookmarks);         
         ybBags.sortBookmarks(bookmarks, order);
         */
         bookmarks = this._sqliteStore.getBookmarksUnionforTags(tags.length, tags, ybBags.getSortOrderString(order), {})
         
         for (var i=0; i<bookmarks.length; i++) {
           var bm = bookmarks[i];
           if (bm.type == YB_TYPE_LIVEMARK) {
             var newBm = {};
             for (var prop in bm) {
               newBm[prop] = bm[prop];
             }
             newBm.order = FAVTAGS_ORDER_DEFAULT;
             bm = newBm;
           }    
           var bmItem = this.createMenuItem(bm);
           menu.appendChild(bmItem);
         }
       }

      if (menu.childNodes.length == 0 ) {
         menu.appendChild(ybBookmarksMenu.createEmptyMenuItem());
      }

       } catch (e) { 
         yDebug.print("ybBookmarksMenu.createBundleMenu(): " + e);
       }
     },

     destroyBundleMenu: function(event) {
       if (content) {
         content.focus();
       }
     },

     createEmptyMenuItem: function () {
       var item = document.createElementNS(gYBXUL_NS, "menuitem"); 
       try {
       item.setAttribute("label", document.getElementById(YB_STRINGS_BOOKMARKS).getString("emptyFolder"));
       } catch(e) {
        item.setAttribute("label", document.getElementById(YB_STRINGS_PLACES).getString("bookmarksMenuEmptyFolder"));
       }
       
       item.setAttribute("disabled", true);

       return item;
     }
};

var ybContextMenu = {

   register : function(){
  
     var menu = document.getElementById("contentAreaContextMenu");
     if(menu){
         menu.addEventListener("popupshowing", this.setup, false);
     }
   
     //hidden menuitems
     try {  
       document.getElementById("yb-context-tagCurrent-aftersearch").hidden = true;
       document.getElementById("yb-context-tagCurrent").hidden = true;
       document.getElementById("yb-context-tagLink").hidden = true; 
     } catch(e){
       yDebug.print(e, YB_LOG_MESSAGE);
     }
   },
      
   unregister : function(){
   
     var menu = document.getElementById("contentAreaContextMenu");
     if(menu){
         menu.removeEventListener("popupshowing", this.setup, false);
     }
     try {
     //hidden menuitems
     document.getElementById("yb-context-tagCurrent-aftersearch").hidden = true;     
     document.getElementById("yb-context-tagCurrent").hidden = true;
     document.getElementById("yb-context-tagLink").hidden = true;
    } catch(e) {
      yDebug.print(e, YB_LOG_MESSAGE);
    }
   },
   
   setup : function(){
       var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                              getService(Components.interfaces.nsIPrefBranch);
       if (this.hideFFBMMenu === undefined) {         
         this.hideFFBMMenu = false;
         try {
            this.hideFFBMMenu = prefs.getBoolPref("extensions.ybookmarks@yahoo.original.ui.hide");
         } catch ( e ) { }
       }
       if (this.hideYBContextMenu === undefined) {
         this.hideYBContextMenu = false;
         try {
            this.hideYBContextMenu = prefs.getBoolPref("extensions.ybookmarks@yahoo.contextmenu.hide");
         } catch ( e ) { }
       }     
   
       if(gContextMenu){
         
         gContextMenu.showItem("yb-context-tagCurrent-aftersearch",  gContextMenu.isTextSelected);
         gContextMenu.showItem("yb-context-tagCurrent",  !gContextMenu.isTextSelected && !( gContextMenu.isContentSelected || gContextMenu.onTextInput || gContextMenu.onLink || gContextMenu.onImage ));
         gContextMenu.showItem("yb-context-tagLink", gContextMenu.onLink && !gContextMenu.onMailtoLink );
         gContextMenu.showItem("yb-context-keywordfield", gContextMenu.onTextInput && gContextMenu.onKeywordField );         
         if (this.hideFFBMMenu) {
            document.getElementById("context-keywordfield").hidden = true;
         }
         if (this.hideYBContextMenu) {
            document.getElementById("yb-context-tagCurrent-aftersearch").hidden = true;
            document.getElementById("yb-context-tagCurrent").hidden = true;
            document.getElementById("yb-context-tagLink").hidden = true;
            document.getElementById("yb-context-keywordfield").hidden = true;
         }
       }
   } 
};

window.addEventListener("load", function() { try { ybBookmarksMenu.onLoad(); } catch(e) { dump("BOOOOOOO: " + e);} }, false);
