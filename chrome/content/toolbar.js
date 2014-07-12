/*
 * requires menubarutils.js ybookmarksOverlay.js
 *
 */
const YB_STRINGS_BOOKMARKS = "yb-strings-bookmarks";
const YB_STRINGS_PLACES = "yb-strings-places";
const KEY_YB_TOOLBAR_SELECTION = "extensions.ybookmarks@yahoo.toolbar.tags.selected";
const KEY_YB_TOOLBAR_VIEW = "extensions.ybookmarks@yahoo.toolbar.view";

const YB_ENABLE_BUNDLES_VIEW = true;

var YB_TOOLBAR_MENULIST_MAX_TAGS = 20;
var YB_TOOLBAR_MAX_BOOKMARKS = 100;

var TAG_RECENTLYBOOKMARKED = "system:bookmonkey:recentlybookmarked";
var TAG_MOSTVISITED = "system:bookmonkey:mostvisited";

var TOOLBAR_DEFAULT_TAG = TAG_RECENTLYBOOKMARKED;

var TOOLBAR_VIEW_BOOKMARKS = 0;
var TOOLBAR_VIEW_TAGS = 1;
var TOOLBAR_VIEW_BUNDLES = 2;
var TOOLBAR_VIEW_DEFAULT = TOOLBAR_VIEW_BOOKMARKS;

var ybToolbar = {
  prefs: null,
  _bookmarksStoreObserver: null,
  _currentView: null,
  _platform: null,
  _bookmarks: null,
  
  onLoad: function() {
    try {
    /* don't do anything if the toolbar is not visible */
      if (!window.toolbar.visible && !window.locationbar.visible) {
        return;
      }
  
    var selectionButton = document.getElementById("ybToolbar-selection");
  
    /* check to see if we're actually in the proper window (i.e, not error console, preferences, etc) */
    if (!selectionButton) {
      return;
    }
    
    window.addEventListener("unload", function() { ybToolbar.onUnload(); }, false);
    
    this._platform = ybookmarksUtils.getPlatform();
    if (this._platform == YB_PLATFORM_MAC) {
      selectionButton.setAttribute("mac", true);
    }
    
    // window resize listener
    document.getElementById( "main-window" ).addEventListener( "resize",  ybToolbar.windowResizeHandler, false );
    
    // prefs
    this.prefs = Components.classes["@mozilla.org/preferences-service;1"].
                      getService(Components.interfaces.nsIPrefBranch);

    /* toolbar */
    var selection = document.getElementById("ybToolbar-selection");
    var selectedTag;
    switch (this.prefs.getPrefType(KEY_YB_TOOLBAR_SELECTION)) {
      case Components.interfaces.nsIPrefBranch.PREF_INT:
        this.prefs.clearUserPref(KEY_YB_TOOLBAR_SELECTION);
        yDebug.print("resetting pref " + KEY_YB_TOOLBAR_SELECTION);
      case Components.interfaces.nsIPrefBranch.PREF_INVALID:
        selectedTag = TOOLBAR_DEFAULT_TAG;
        yDebug.print("setting pref " + KEY_YB_TOOLBAR_SELECTION + ": " + selectedTag);
        break;
        
      case Components.interfaces.nsIPrefBranch.PREF_STRING:
        selectedTag = ybookmarksUtils.getUnicodePref(KEY_YB_TOOLBAR_SELECTION, this.prefs);
        yDebug.print(KEY_YB_TOOLBAR_SELECTION + ": " + selectedTag);
      
        break;
    }
    if (!selectedTag) {
      selectedTag = TOOLBAR_DEFAULT_TAG;
    }
    yDebug.print("ybToolbar.onLoad: selectedTag=" + selectedTag);
    selection.setAttribute("value", selectedTag);
    this.reconstructMenuList();

//    this.refreshBookmarksView(selectedTag);
    //selection.label = selectedTag;

    /* observer for datasource and sync changes */
    this._bookmarksStoreObserver = {
      _ybToolbar: this,
      _shouldUpdateToolbar : false,
      _syncing : false,
      
      _updateToolbar : function () {
        
        //fixed scope problem
        if (this != ybToolbar._bookmarksStoreObserver) {
          ybToolbar._bookmarksStoreObserver._updateToolbar();  
        }
                
        if (this._shouldUpdateToolbar) {
  
          if (this._syncing) {
            setTimeout(this._updateToolbar, 2000);          
            return;
          }

          this._shouldUpdateToolbar = false;          
          ybToolbar.refreshCurrentView();
        }
      },
      
      observe: function ( aSubject, aTopic, aData ) {
            if ( aTopic == "ybookmark.syncBegin" ) {
              this._syncing = true;
              
            } else if ( aTopic == "ybookmark.syncDone" ) {
                this._syncing = false;
              
               if ( aData == "all-done" || aData == "remove-bookmarks" || aData == "remove-extra") {
                 this._shouldUpdateToolbar = true;                    
                 setTimeout(this._updateToolbar, 0);            
              } 
            } else if ( aTopic == "ybookmark.syncInfo" ) {
              if ( aData =="more-chunk" ) {
                  // probably wait for whole update to finish
              } else if (aData == "add-to-ds-end") {
                 this._shouldUpdateToolbar = true;                    
                 setTimeout(this._updateToolbar, 0);
              }
            } else if (aTopic == "ybookmark.faviconLoaded" ) {
                if(ybToolbar._bookmarks.length > 0) {
                    var data = aData.split(" ");
                    for(var i in ybToolbar._bookmarks) {
                        if(data[0] == ybToolbar._bookmarks[i].url) {
                            ybToolbar._bookmarks[i].icon = data[1];
                            ybToolbar._populateBookmarksView(ybToolbar._bookmarks);
                        }
                    }
                }
            } else if (aTopic == "ybookmark.bookmarkAdded" || aTopic == "ybookmark.bookmarkEdited" || aTopic == "ybookmark.bookmarkDeleted") {
                 this._shouldUpdateToolbar = true;                    
                 setTimeout(this._updateToolbar, 0);
            } else if ( aTopic == "ybookmark.migrationEnd" ) {
                this._shouldUpdateToolbar = true;                    
                setTimeout(this._updateToolbar, 0);                
            } else if("ybookmark.updateBookmarksView" == aTopic) {
                this._shouldUpdateToolbar = true;                    
                setTimeout(this._updateToolbar, 0);
            }
      }
    };
    
    //add observer for sync
    var os = Components.classes["@mozilla.org/observer-service;1"]
                                     .getService(Components.interfaces.nsIObserverService);
    os.addObserver ( this._bookmarksStoreObserver, "ybookmark.syncBegin", false );
    os.addObserver ( this._bookmarksStoreObserver, "ybookmark.syncInfo", false );
    os.addObserver ( this._bookmarksStoreObserver, "ybookmark.syncDone", false );    
    os.addObserver ( this._bookmarksStoreObserver, "ybookmark.faviconLoaded", false );
    os.addObserver ( this._bookmarksStoreObserver, "ybookmark.bookmarkAdded", false );
    os.addObserver ( this._bookmarksStoreObserver, "ybookmark.bookmarkEdited", false );
    os.addObserver ( this._bookmarksStoreObserver, "ybookmark.bookmarkDeleted", false );
    os.addObserver ( this._bookmarksStoreObserver, "ybookmark.migrationEnd", false );
    os.addObserver ( this._bookmarksStoreObserver, "ybookmark.updateBookmarksView", false );
    
    
    //this.refreshBookmarksView();
    
    //check for selected view
    var selectedView = this.prefs.getIntPref(KEY_YB_TOOLBAR_VIEW);
  
    
  /*  var selectedViewItem;
    var selectedViewItemOptions;    
    if (selectedView == TOOLBAR_VIEW_BOOKMARKS) {
          selectedViewItem = document.getElementById("ybToolbar-context-menu-view-bookmarks");
          selectedViewItemOptions = document.getElementById("ybToolbar-options-view-bookmarks");
      } else {
          selectedViewItem = document.getElementById("ybToolbar-context-menu-view-tags");
          selectedViewItemOptions = document.getElementById("ybToolbar-options-view-tags");
      }
      selectedViewItem.setAttribute("checked", true);
      selectedViewItemOptions.setAttribute("checked", true);
      */
    setTimeout(function(selectedView) {ybToolbar.setView(selectedView);}, 100, selectedView);
    
    // bundles related
    
        
    if (!YB_ENABLE_BUNDLES_VIEW) {
      document.getElementById("yb-broadcaster-bundlesview-menuitem").setAttribute("hidden", true);
    }       
    } catch(e) {
      yDebug.print("ybToolbar.onLoad: " + e, YB_LOG_MESSAGE);
    }
  },
  
  
  onUnload: function() {
    
    var os = Components.classes["@mozilla.org/observer-service;1"]
                                     .getService(Components.interfaces.nsIObserverService);
    try {
          os.removeObserver ( this._bookmarksStoreObserver, "ybookmark.syncDone" );
          os.removeObserver ( this._bookmarksStoreObserver, "ybookmark.syncInfo" );
          os.removeObserver ( this._bookmarksStoreObserver, "ybookmark.syncBegin" );
        os.removeObserver ( this._bookmarksStoreObserver, "ybookmark.faviconLoaded" );
        os.removeObserver ( this._bookmarksStoreObserver, "ybookmark.bookmarkAdded" );
        os.removeObserver ( this._bookmarksStoreObserver, "ybookmark.bookmarkEdited" );
        os.removeObserver ( this._bookmarksStoreObserver, "ybookmark.bookmarkDeleted" );
        os.removeObserver ( this._bookmarksStoreObserver, "ybookmark.migrationEnd" );
        os.removeObserver ( this._bookmarksStoreObserver, "ybookmark.updateBookmarksView" );      
    }
    catch(e){ }
  },
  
  firstTimeStart: function() {
    this.reconstructMenuList();    
  },
  
  setView: function(aView) {
    var tagsView = document.getElementById("ybToolbar-tagsview");
    var bookmarksView = document.getElementById("ybToolbar-bookmarksview");
    var bundlesView = document.getElementById("ybToolbar-bundlesview");
    this._currentView = aView;
      
    var bookmarksItem = document.getElementById("yb-broadcaster-bookmarksview-menuitem");
    var tagsItem = document.getElementById("yb-broadcaster-tagsview-menuitem");
    var bundlesItem = document.getElementById("yb-broadcaster-bundlesview-menuitem");
    
    if (aView == TOOLBAR_VIEW_BOOKMARKS) {
      tagsView.hidden = true;
          bookmarksView.hidden = false;
          bundlesView.hidden = true;
          this.refreshBookmarksView();
          bookmarksItem.setAttribute("checked", true);
          tagsItem.setAttribute("checked", false);
          bundlesItem.setAttribute("checked", false);

      } else if (aView == TOOLBAR_VIEW_TAGS) {
        tagsView.hidden = false;
        bookmarksView.hidden = true;
          bundlesView.hidden = true;
        this.refreshTagsView();
          bookmarksItem.setAttribute("checked", false);
          tagsItem.setAttribute("checked", true);
          bundlesItem.setAttribute("checked", false);

      } else if (aView == TOOLBAR_VIEW_BUNDLES) {
        tagsView.hidden = true;
        bookmarksView.hidden = true;
        bundlesView.hidden = false;
        this.refreshBundlesView();
      bookmarksItem.setAttribute("checked", false);
          tagsItem.setAttribute("checked", false);
          bundlesItem.setAttribute("checked", true);

      } else {
          return;
      }

    this.prefs.setIntPref(KEY_YB_TOOLBAR_VIEW, aView);
  },
  
  currentViewButtons: function() {
    var buttons;
    if (this._currentView == TOOLBAR_VIEW_BOOKMARKS) {
      buttons = document.getElementById("ybToolbar-bookmarksview-bookmarks");
    } else if (this._currentView == TOOLBAR_VIEW_TAGS) {
      buttons = document.getElementById("ybToolbar-tagsview-tags");
    } else if (this._currentView == TOOLBAR_VIEW_BUNDLES) {
      buttons = document.getElementById("ybToolbar-bundlesview-bundles");
    }
    return buttons;
  },
  
  /*** menu list ***/
  reconstructMenuList: function() {
    yDebug.print("reconstructing Menulist");
    this.addTagsToMenuList();
    
    var button = document.getElementById("ybToolbar-selection");
    var selectedTag =  button.getAttribute("value");
    
    if (selectedTag != TAG_RECENTLYBOOKMARKED && selectedTag != TAG_MOSTVISITED) {
      var tags = ybBags.getFavoriteTags();
      var selectedTagExists = false;
      for (var tagIndex = 0; tagIndex < tags.length && tagIndex < YB_TOOLBAR_MENULIST_MAX_TAGS; ++tagIndex) {
        if (selectedTag == tags[tagIndex]) {
          selectedTagExists = true;
          break;
        }
      }
    
      if (!selectedTagExists) {
        button.setAttribute("label", ybookmarksMain.strings.getString("extensions.ybookmarks.recently.bookmarked"));
        button.setAttribute("value", TAG_RECENTLYBOOKMARKED);
        button.setAttribute("class", "yb-tag-item-reserved");
        this.refreshBookmarksView();
      }
    }
  },
  
  
  addTagsToMenuList: function() {  
      var tags = ybBags.getFavoriteTags();
      var menu = document.getElementById("ybToolbar-selection-popup");
      var start = document.getElementById("ybToolbar-selection-tags-start");
      var end = document.getElementById("ybToolbar-selection-tags-end");
      
      this._exciseMenuDestructive(menu, start, end);
      
      // add the tags
      for (var tagIndex = 0; tagIndex < tags.length && tagIndex < YB_TOOLBAR_MENULIST_MAX_TAGS; ++tagIndex) {
        var tagName = tags[tagIndex];
        var tagItem = ybookmark_Utils.createMenuItem(tagName, "", "", "");  
        tagItem.removeAttribute("command");
        tagItem.setAttribute("oncommand", "ybToolbar.refreshBookmarksView(event.target.value);");
        tagItem.setAttribute("value", tagName);
        tagItem.setAttribute("class", "menuitem-iconic yb-tag-item");
        menu.insertBefore(tagItem, end);
      }
      
      if (tags.length > 0) {
        end.hidden = true;
      } else {
        end.hidden = false;
      }
  },
  
  
  /**
    * Remove from parent the childNodes in-between start and end, non-inclusive
    * Note: this modifies parent
    */
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
  
  _createToolbarButton: function(aView, aItem) {
        var btn = document.createElementNS(gYBXUL_NS, "toolbarbutton");
        btn.setAttribute("label", aItem.name);  
        
        if (aView == TOOLBAR_VIEW_BOOKMARKS) {
          btn.setAttribute("url", aItem.url );
          btn.setAttribute("image", aItem.icon);
        btn.setAttribute("class", "bookmark-item");
        btn.setAttribute("context", "yb-bookmarks-context-menu");
    
          if (aItem.type == YB_TYPE_LIVEMARK) {
            btn.setAttribute("livemark", true);
            btn.setAttribute("container", true);
            btn.setAttribute("type", "menu");
            var popup = document.createElementNS(gYBXUL_NS, "menupopup");
            popup.setAttribute("onpopupshowing", "if (event.target == this) { ybBookmarksMenu.createLivemarkMenu(event.target); }");
            popup.setAttribute("onpopuphiding", "if (event.target == this) { ybBookmarksMenu.destroyLivemarkMenu(event); }");
          btn.setAttribute("order", aItem.order );
            btn.appendChild(popup);
      
          } else {
            btn.setAttribute("oncommand", "if (event.target == this) { ybookmarksUtils.openBookmark(event);}");
            btn.setAttribute("onclick", "if (event.target == this && event.button == 1) { ybookmarksUtils.openBookmark(event); }");
            btn.setAttribute("tooltip", "ybToolbar-tooltip");
            btn.setAttribute("type", aItem.type);
            btn.setAttribute("statustext", aItem.url);
          }
    
        } else if (aView == TOOLBAR_VIEW_TAGS) {
            btn.setAttribute("context", "yb-tags-context-menu");
  
            btn.setAttribute("container", true);
            btn.setAttribute("class", "yb-tag-item");          
            btn.setAttribute("type", "menu");
            var popup = document.createElementNS(gYBXUL_NS, "menupopup");
            popup.setAttribute("onpopupshowing", "if (event.target == this) { ybBookmarksMenu.createTagMenu(event.target); }");
            popup.setAttribute("onpopuphiding", "if (event.target == this) { ybBookmarksMenu.destroyTagMenu(event); }");
          
            btn.appendChild(popup);      
    
        } else if (aView == TOOLBAR_VIEW_BUNDLES) {
            btn.setAttribute("container", true);
            btn.setAttribute("class", "yb-bundle-item");          
            btn.setAttribute("type", "menu");
            
            var popup = document.createElementNS(gYBXUL_NS, "menupopup");
            popup.setAttribute("onpopupshowing", "if (event.target == this) { ybBookmarksMenu.createBundleMenu(event.target); }");
            popup.setAttribute("onpopuphiding", "if (event.target == this) { ybBookmarksMenu.destroyBundleMenu(event); }");
                btn.appendChild(popup);      
            }
      
      if (aItem.order) {
        btn.setAttribute("order", aItem.order);  
      }
      if (aItem.favoriteTag) {
        btn.setAttribute("favoriteTag", aItem.favoriteTag);  
      }
/* ******* leaving this checked in, as it can be turned on quickly *******
    if( aItem.shared == "false" ) {
      btn.setAttribute( "class", btn.getAttribute( "class" ) + " private-bookmark" );
    }
*/
    return btn;
  },
  
  _getSelectedTag: function() {
    var button = document.getElementById("ybToolbar-selection");
    return button.getAttribute("value")
  },
  
  
  /*** Event handlers ***/
 
  refreshCurrentView: function() {
   if (this._currentView == TOOLBAR_VIEW_BOOKMARKS) {
     this.refreshBookmarksView();
   } else if (this._currentView == TOOLBAR_VIEW_TAGS) {
       this.refreshTagsView();
   } else if (this._currentView == TOOLBAR_VIEW_BUNDLES) {
     this.refreshBundlesView();
   }
  },
   
  /**
   * refreshes the Bookmarks view - populates the toolbar with the appropriate bookmarks
   * @param aTag optional tag to indicate selected tag. null means to refresh the view with the currently selected tag. 
   */
  refreshBookmarksView: function(aTag) {
    try {
    var button = document.getElementById("ybToolbar-selection");
    var selectedTags;
    
    if (aTag) {
      selectedTags = aTag;
    } else {
      selectedTags =  button.getAttribute("value");
    }
    var label;
    //var order = FAVTAGS_ORDER_DEFAULT;
    yDebug.print("Selected tags: " + selectedTags);
    var sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
					  getService(Components.interfaces.nsIYDelLocalStore);
					  
    if (selectedTags == TAG_MOSTVISITED) {
      this._bookmarks = sqliteStore.getMostVisitedBookmarks(YB_TOOLBAR_MAX_BOOKMARKS, {});
      label = ybookmarksMain.strings.getString("extensions.ybookmarks.most.visited");
      button.setAttribute("class", "yb-tag-item-reserved");
      
    } else if (selectedTags == TAG_RECENTLYBOOKMARKED) {
      this._bookmarks = sqliteStore.getRecentBookmarks(YB_TOOLBAR_MAX_BOOKMARKS, {});
      label = ybookmarksMain.strings.getString("extensions.ybookmarks.recently.bookmarked");
      button.setAttribute("class", "yb-tag-item-reserved");
    
    } else if (selectedTags == "") {
      label = "";
      this._bookmarks = [];
    } else {
      var order = ybBags.getFavoriteTagOrder(selectedTags);  
      this._bookmarks = ybBags.getBookmarksFromFavoriteTag(selectedTags, order);
      label = selectedTags;
      button.setAttribute("class", "yb-tag-item");
    
    }
    button.setAttribute("label", label);
    button.setAttribute("value", selectedTags);
    //document.getElementById("ybToolbar-bookmarksview").setAttribute("order", order);
    
    if (this._bookmarks) {
      this._populateBookmarksView(this._bookmarks);     
    }
    if (aTag) {
      ybookmarksUtils.setUnicodePref(KEY_YB_TOOLBAR_SELECTION, aTag, this.prefs);
    }
    } catch (e) {
      yDebug.print("ybToolbar.refreshBookmarksView(" + aTag + "): error: " + e, YB_LOG_MESSAGE);
    } 
  },
  
    refreshTagsView: function () {
      var tags = ybBags.getFavoriteTags();
      
      var tagsArg = tags.map(function(tag) { 
                                    return {name: tag,
                                            url: "",
                                            icon: "",
                                            type: YB_TYPE_TAG,
                                            order: ybBags.getFavoriteTagOrder(tag),
                                            favoriteTag: true};
                                 });
      this._populateTagsView(tagsArg);
    },
    
    refreshBundlesView: function() {
      try {
      var bundles = ybookmarksMain.gBookmarks.getBundles({});
      bundles = bundles.map(function(b) { return { name: b.name,
                                                   type: YB_TYPE_BUNDLE,
                                                   order: b.order }; });
                                                     
      this._populateBundlesView(bundles);
    } catch (e) { yDebug.print("refreshBundlesView: " + e);}
    },
    
    _populateBookmarksView: function(bookmarks) {
      this._populateView(TOOLBAR_VIEW_BOOKMARKS, bookmarks);
    },

    _populateTagsView: function(tags) {
      this._populateView(TOOLBAR_VIEW_TAGS, tags);
    },
    
    _populateBundlesView: function(bundles) {
      this._populateView(TOOLBAR_VIEW_BUNDLES, bundles);
    },
    
    _populateView: function(aView, aItems) {
      try {
      var buttons;
      var order;
      if (aView == TOOLBAR_VIEW_BOOKMARKS) {
        buttons = document.getElementById("ybToolbar-bookmarksview-bookmarks");
        order = ybBags.getFavoriteTagOrder(this._getSelectedTag());
      } else if (aView == TOOLBAR_VIEW_TAGS) {
        buttons = document.getElementById("ybToolbar-tagsview-tags");
      } else if (aView == TOOLBAR_VIEW_BUNDLES) {
        buttons = document.getElementById("ybToolbar-bundlesview-bundles");
      } else {
        return;
      }
      var menu = document.getElementById ( "ybToolbar-chevron" ).firstChild;
      
      // clear buttons and menu
      while (buttons.childNodes.length > 0) {
          buttons.removeChild(buttons.lastChild);
      }
      while (menu.childNodes.length > 0) {
          menu.removeChild(menu.lastChild);
      }
      var numItems = aItems.length < YB_TOOLBAR_MAX_BOOKMARKS ? aItems.length : YB_TOOLBAR_MAX_BOOKMARKS; 
      for (var i=0; i < numItems; i++) {
        var item = aItems[i];
        if (item.type == YB_TYPE_LIVEMARK) {
          var newItem = {};
          for (var prop in item) {
            newItem[prop] = item[prop];
          }
          newItem.order = FAVTAGS_ORDER_USER;
          item = newItem;
        }
        var button = this._createToolbarButton(aView, item);
        button.setAttribute("collapsed", true);
        buttons.appendChild(button);        

        var menuItem = ybBookmarksMenu.createMenuItem(item);
        menuItem.setAttribute("hidden", true);
        menu.appendChild(menuItem);
      }
      this.redrawLayout();
    } catch (e) {
        yDebug.print("ybToolbar._populateView(" + aView + ", ... ): error: " + e.stack, YB_LOG_MESSAGE);
    }
  },
  
  openToolbarOptions: function() {
    setTimeout( "ybToolbar._focusTabPanel()", 100 );
    openPreferences( "paneBookmarks" );
  },

  _focusTabPanel: function() {
    var wm = Components.classes[ "@mozilla.org/appshell/window-mediator;1" ]
                            .getService( Components.interfaces.nsIWindowMediator );
    var ref = wm.getMostRecentWindow( null );
    if( ref ) {
      var box, panel, tab;
      box = ref.window.document.getElementById( "bookmarksPrefs" );
      tab = ref.window.document.getElementById( "tab_yb_bags" );
      panel = ref.window.document.getElementById( "tbp_yb_bags" );
      if( ( box != null ) && ( panel != null ) && ( tab != null ) ) {
        box.selectedTab = tab;
        box.selectedPanel = panel;
      }
    }
  },

  /*_stopBubble: function(event) {
    try {
      var stopItems = [ "ybToolbar-selection-tagstoolbar-editor", 
                        "ybToolbar-selection-options" 
                      ];
      var stopFuncs = [ function() { ybToolbar.openTagsToolbarEditor(); }, 
                        function() { ybToolbar.openToolbarOptions(); } 
                      ];      
      
      var stop = false;
      var func;
      for (var i = 0; i < stopItems.length; i++) {
        if (event.target.id == stopItems[i]) {
          stop = true;
          func = stopFuncs[i];
          break;
        }
      }    
      
      if (stop) {
        if (func != null) {
            func.call();
        }
        event.preventBubble();
      }
  } catch (e) {
    
  }
    
  },*/
  
  openURLIn: function(event, where) {
    switch (where) {
      case "current":
      case "window":
      case "tab":
        event.target.setAttribute("type", YB_TYPE_BOOKMARK);
        event.target.setAttribute("url", document.popupNode.getAttribute("url"));   
        ybookmarksUtils.openBookmark(event, where);
      break;
    }

  },

  openTag: function (aMenu, aEvent) {
    var tag = aMenu.parentNode.getAttribute("label");
    ybookmarksUtils.openTag(tag, aEvent);
  },

  openBookmarkContainer: function (aMenu) {
        var livemark = aMenu.parentNode.getAttribute("livemark");
        if (livemark) {
          ybBookmarksMenu.createLivemarkMenu(aMenu);
        } else {
          ybBookmarksMenu.createTagMenu(aMenu);
        }
        YBtabsOpener.open(aMenu);    
  },
  
  moreAbout: function(event) {
     event.target.setAttribute("type", YB_TYPE_BOOKMARK);
     event.target.setAttribute("url", deliciousService.getMoreAboutUrl(
        document.popupNode.getAttribute("url")));
     ybookmarksUtils.openBookmark(event, "current");
  },
     
   openTagsToolbarEditor : function() {
      var win = window.openDialog( "chrome://ybookmarks/content/tagsToolbarEditor.xul",
                    "",
                    "chrome,centerscreen,modal,dialog=no,resizable=yes",
                    { _ybToolbar: this,
                      onUpdate: function() {  if (this._ybToolbar._currentView == TOOLBAR_VIEW_BOOKMARKS) {
                                                this._ybToolbar.refreshBookmarksView();
                                              } else if (this._ybToolbar._currentView == TOOLBAR_VIEW_TAGS){
                                                this._ybToolbar.refreshTagsView();
                                              }
                                              this._ybToolbar.reconstructMenuList();
                                            }
                    });
  },

  openBundleEditor : function() {
     var win = window.openDialog( "chrome://ybookmarks/content/bundleEditor.xul",
                   "",
                   "chrome,centerscreen,modal,dialog=no,resizable=yes",
                   { _ybToolbar: this,
                     onUpdate: function() {  if (this._ybToolbar._currentView == TOOLBAR_VIEW_BUNDLES) {
                                               this._ybToolbar.refreshBundlesView();
                                             }
                                           }
                   });
   },

  getSelectedType : function() {
    var button = document.getElementById("ybToolbar-selection"); 
    var val = button.getAttribute("value");
    return val ? val : "";
  },
   
   windowResizeHandler: { 
     handleEvent: function (event) {
         ybToolbar.redrawLayout();
     }
   },

  /*** dynamic layout ***/
  updateOverflowMenu: function (aMenuPopup)
  {
    var buttons = this.currentViewButtons();//document.getElementById("ybToolbar-bookmarksview-bookmarks");

    for (var i = 0; i < buttons.childNodes.length; i++) {
      var button = buttons.childNodes[i];
      var menu = aMenuPopup.childNodes[i];
      if (menu.hidden == button.collapsed)
        menu.hidden = !menu.hidden;
    }
  },

  _redrawLayoutEventListener: function(event) {
    ybToolbar.redrawLayout(event);
  },
  
  redrawLayout: function(event) {
    try {
    if (event && event.type == 'focus') { 
      window.removeEventListener('focus', this._redrawLayoutEventListener, false); // hack for bug 266737  
    }
    var buttons = this.currentViewButtons();//document.getElementById("ybToolbar-bookmarksview-bookmarks");
    if (!buttons)
      return;
    var width = window.innerWidth;
    //yDebug.print("THE WIDTH: " + width + " | " + window.outerWidth);
    if (width <= 1) {  // hack for bug 266737
        
      window.addEventListener('focus', this._redrawLayoutEventListener, false);
      return;
    }
    var chevron = document.getElementById("ybToolbar-chevron");
    if (buttons.childNodes.length <= 0) {
      // No bookmarks means no chevron
      chevron.collapsed = true;
      return;
    }

    var toolbar = document.getElementById("ybToolbar-options").parentNode.parentNode;
    for (var i = toolbar.childNodes.length-1; i >= 0; i--){
      var anItem = toolbar.childNodes[i];
      if (anItem.id == "ybToolbar-toolbar") {
        break;
      } else if (anItem.id == "urlbar-container") {
        /* we want the minimum width, but I can't seem to be able to access it */
        width -= anItem.boxObject.width;
      } else {
        width -= anItem.boxObject.width;
      }
    }
    
    chevron.collapsed = false;
    var chevronWidth = chevron.boxObject.width;
    chevron.collapsed = true;
    var overflowed = false;
    var isLTR = window.getComputedStyle(document.getElementById("PersonalToolbar"),'').direction=='ltr';
  
    for (var i=0; i<buttons.childNodes.length; i++) {
      var button = buttons.childNodes[i];
      button.collapsed = false;
      var button_x = button.boxObject.x;
      var button_width = button.boxObject.width;
      button.collapsed = overflowed;
      
      if (i == buttons.childNodes.length - 1) {// last item...
        chevronWidth = 0;
      }
      var offset = isLTR ? button_x : width - button_x;
      //yDebug.print("" + offset + " | " + button_width+ " | " + chevronWidth+ " > " + width);
      if (offset + button_width + chevronWidth > width) {
         overflowed = true;
        // This button doesn't fit. Show it in the menu. Hide it in the toolbar.
        if (!button.collapsed) {
          button.collapsed = true;
        }
        if (chevron.collapsed) {
          chevron.collapsed = false;
          var overflowPadder = document.getElementById("ybToolbar-overflow-padder");
        
          offset = isLTR ? button_x : width - buttons.boxObject.x - buttons.boxObject.width;
          overflowPadder.width = width - chevron.boxObject.width - offset;    
        }
      }      
    }
    
  } catch (e) { 
    yDebug.print("redrawLayout(): " + e, YB_LOG_MESSAGE); 
  }
  },
  
  dndObserver: {
  
    getSupportedFlavours : function () {
      var flavourSet = new FlavourSet();
      flavourSet.appendFlavour("moz/rdfitem");
      flavourSet.appendFlavour("text/x-moz-url");
      flavourSet.appendFlavour("application/x-moz-file", "nsIFile");
      flavourSet.appendFlavour("text/unicode");
      return flavourSet;
    },

    onDragOver: function(event, flavour, session){
      var statusTextField = document.getElementById( "statusbar-display" );
      if ( gNavigatorBundle && statusTextField ) {
        statusTextField.label = gNavigatorBundle.getString( "droponbookmarksbutton" );
      }
      session.dragAction = Components.interfaces.nsIDragService.DRAGDROP_ACTION_LINK;
    },

    onDrop: function(event, dropdata, session) {
      if (dropdata.data != "") {
            var data = dropdata.data.split("\n");
            var url = data[0];
            var name = data[1];
            
           	var userSelectedTag = null;
           	//make sure that tags view is selected
           	var tagsView = document.getElementById("ybToolbar-tagsview");           	
            if (tagsView.hidden == false) {
                userSelectedTag = event.target.getAttribute("label");
            } else { 
	            //bookmarks view
	            var bookmarksView = document.getElementById("ybToolbar-bookmarksview");
	            if (bookmarksView.hidden == false) {
	            	var button = document.getElementById("ybToolbar-selection");
		            var selectedTag =  button.getAttribute("value");
		            if (selectedTag != TAG_RECENTLYBOOKMARKED && selectedTag != TAG_MOSTVISITED) {
		            	userSelectedTag = 	selectedTag;
		            }	
	            }       
            }
            yAddBookMark.open(url, name, null, null, null, null, null, null, null, userSelectedTag);
      } 
    },
        
    onDragExit: function( event, session ) {
      var statusTextField = document.getElementById( "statusbar-display" );
      if ( statusTextField )
        statusTextField.label = "";
    }
  },
  
  onEditBundle: function(event, mouseClick) {
    var bundle = event.target.parentNode.parentNode.getAttribute("label");
    event.bundle = bundle;
    ybookmarksMain.loadRelevantPage(event, 'editbundle', mouseClick);
  },
  
  /*** Misc stuff ***/
  // Fill in tooltips for personal toolbar (and Bookmarks menu).
  fillInBTTooltip: function (tipElement) {

    var title = tipElement.label;
    var url = tipElement.statusText;

    // Don't show a tooltip without any data.
    if (!title && !url)
      return false;

    var tooltipElement = document.getElementById("ybToolbar-tooltip-text");
    tooltipElement.hidden = !title || (title == url);
    if (!tooltipElement.hidden)
      tooltipElement.setAttribute("value", title);

    tooltipElement = document.getElementById("ybToolbar-tooltip-url");
    tooltipElement.hidden = !url;
    if (!tooltipElement.hidden)
      tooltipElement.setAttribute("value", url);

    return true;
  },
    
  /* menu autoopen code ganked from /browser/components/bookmarks/content/bookmarksMenu.js */
  _openedMenuButton:null,
  autoOpenMenu: function (aEvent) {
    var target = aEvent.target;
    if (ybToolbar._openedMenuButton != target && target.nodeName == "toolbarbutton" && target.type == "menu") {
      ybToolbar._openedMenuButton.open = false;
      target.open = true;
    }
  },
 
  setOpenedMenu: function (aEvent) {
    if (aEvent.target.parentNode.localName == 'toolbarbutton') {
      if (!this._openedMenuButton) {
        aEvent.currentTarget.addEventListener("mouseover", this.autoOpenMenu, true);
      }
      this._openedMenuButton = aEvent.target.parentNode;
    }
  },
 
  unsetOpenedMenu: function (aEvent) {
    if (aEvent.target.parentNode.localName == 'toolbarbutton') {
      aEvent.currentTarget.removeEventListener("mouseover", this.autoOpenMenu, true);
      this._openedMenuButton = null;
    }
  }

};

window.addEventListener("load", 
                        function() { 
                          try { 
                            ybToolbar.onLoad(); 
                          } catch(e) { 
                            yDebug.print("Error loading Toolbar: " + e );
                          }
                        }, 
                        false);

