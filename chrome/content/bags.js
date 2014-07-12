/* requires json.js */


const BAG_TAGSTOOLBAR = "Tags Toolbar"; // only used for the conversion

const FAVTAGS_ORDER_CHRONO = "0";
const FAVTAGS_ORDER_CHRONO_REVERSE = "1";
const FAVTAGS_ORDER_ALPHANUM = "2";
const FAVTAGS_ORDER_ALPHANUM_REVERSE = "3";
const FAVTAGS_ORDER_MOST_VISITED = "4";
const FAVTAGS_ORDER_USER = "user";

const FAVTAGS_ORDER = [ { key: FAVTAGS_ORDER_CHRONO_REVERSE, 
                          label: "extensions.ybookmarks.toolbar.order.chrono.reverse" },
                        { key: FAVTAGS_ORDER_CHRONO, 
                          label: "extensions.ybookmarks.toolbar.order.chrono" },
                        { key: FAVTAGS_ORDER_ALPHANUM, 
                          label: "extensions.ybookmarks.toolbar.order.alphanum" },
                        { key: FAVTAGS_ORDER_ALPHANUM_REVERSE, 
                          label: "extensions.ybookmarks.toolbar.order.alphanum.reverse" },
                        { key: FAVTAGS_ORDER_MOST_VISITED, 
                          label: "extensions.ybookmarks.toolbar.order.mostvisited" }
                      ];

const FAVTAGS_ORDER_DEFAULT = FAVTAGS_ORDER_CHRONO_REVERSE;

var ybBags = {
  
  sqliteStore: null,
    
  onLoad: function() {
    try {
      this.sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
					  getService(Components.interfaces.nsIYDelLocalStore);
      
      this.upgradeFavoriteTags();
      
	  } catch (e) { 
      yDebug.print(e, YB_LOG_MESSAGE);
    }
  },
  //Converts from integer to string representation understood by store.
  getSortOrderString: function(aSortOrder) {
    switch(aSortOrder) {
        case "0": return "LastAddedReverse";
        case "1": return "LastAdded";
        case "2": return "Name";
        case "3": return "NameReverse";
		case "4": return "MostVisited";
        default:
            return "LastAdded";
    }    
  },
  
  /*
   * Upgrades the Favorite Tags from using preferences to using the datastore (1.3.51)
   *   It copied over the favorite tags and set extensions.ybookmarks@yahoo.bags.converted to true
   *
   *   2007-01-22 cmyang: As of the 1.4 branch, we're just going to convert and clean up the preferences
   *              rather than leave the info in the preferences
   */
  upgradeFavoriteTags: function () {
    var key_yb_bags = "extensions.ybookmarks@yahoo.bags";
    var key_yb_bags_converted = "extensions.ybookmarks@yahoo.bags.converted";
    try {
      var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                          getService(Components.interfaces.nsIPrefBranch);
    
      if (prefs.prefHasUserValue(key_yb_bags)) {
      
        var converted;
        var oldVer = prefs.getCharPref("extensions.ybookmarks@yahoo.version.number").split(".");
      
        if (oldVer.length == 3 && oldVer[1] == 3 && oldVer[2] <= 51 && prefs.prefHasUserValue(key_yb_bags_converted)) {
          converted = false;
        } else {
          converted = prefs.prefHasUserValue(key_yb_bags_converted) && prefs.getBoolPref(key_yb_bags_converted);
        }
         
        if (!converted) { 
          var ttBag = this._getTagsToolbarBag();
            yDebug.print("moving Favorite Tags to localstore...");
      
          if ( ttBag != null) {
            //this.sqliteStore.clearFavoriteTags();
            for (var i=0; i < ttBag.tags.length ; i++) {
              yDebug.print("moving Favorite Tag: " + ttBag.tags[i]);
              this.addFavoriteTag(ttBag.tags[i]);
            }
          }
          yDebug.print("moving Favorite Tags to localstore: done!");
        }
        
        // clean up the preferences
        prefs.clearUserPref(key_yb_bags);
        prefs.clearUserPref(key_yb_bags_converted);
      }
    } catch (e) {
      yDebug.print("error upgrading favorite tags: " + e, YB_LOG_MESSAGE);
    }
  },

  getFavoriteTags: function (aTags) {
    var tags = (aTags) ? aTags : [];
    var favTags = this.sqliteStore.getFavoriteTags({});
    /*var jsFavTags = [];
    nsFavTags.QueryInterface(Components.interfaces.nsIArray);
    var ftEnum = nsFavTags.enumerate();
    while (ftEnum.hasMoreElements()) {
      var nsString = ftEnum.getNext();
      nsString.QueryInterface(Components.interfaces.nsISupportsString);
      jsFavTags.push(nsString.data);
    }*/
    return favTags;
  },
  
  addFavoriteTag: function(tag) {
    this.sqliteStore.addFavoriteTag(tag);
  },
  
  deleteFavoriteTag: function(tag) {
    this.sqliteStore.deleteFavoriteTag(tag);
  },

  moveFavoriteTag: function(tag, index) {
    this.sqliteStore.moveFavoriteTag(tag, index);
  },
  
  
  getBookmarksFromFavoriteTag: function(aFavTag, aOrder) {
    try {
      /* 
      if (!aOrder && (aOrder != FAVTAGS_ORDER_CHRONO)) {
        aOrder = FAVTAGS_ORDER_DEFAULT;
      }
      */
      var bm = this.sqliteStore.getBookmarksFromFavoriteTag(aFavTag, {});
      //this.sortBookmarks(bm, aOrder);
      return bm;
    } catch (e) { 
      yDebug.print("getBookmarksForTagOrdered(" + aFavTag + "): " + e);
      return [];
    }
  },

  getFavoriteTagOrder: function (aTag) {
    return this.sqliteStore.getFavoriteTagOrder(aTag);
  },
  
  setFavoriteTagOrder: function (aTag, aOrder) {
    this.sqliteStore.setFavoriteTagOrder(aTag, aOrder);
  },
  
  saveFavoriteTags: function() {
    this.sqliteStore.saveFavoriteTags();
  },
  
  isFavoriteTag: function (aTag) {
    return this.sqliteStore.isFavoriteTag(aTag);
  },
  
  /* note that this function sorts the array in place */
  sortBookmarks: function (bookmarks, aOrder) {
  	var func = null;

    if (aOrder == FAVTAGS_ORDER_CHRONO) {
      func = function(a, b) { return a.added_date - b.added_date; };
    } else if (aOrder == FAVTAGS_ORDER_CHRONO_REVERSE) {
      func = function(a, b) { return b.added_date - a.added_date; };      
    } else if (aOrder == FAVTAGS_ORDER_ALPHANUM) {
       func = function(a, b) { return a.name.localeCompare(b.name); };      
    } else if (aOrder == FAVTAGS_ORDER_ALPHANUM_REVERSE) {
       func = function(a, b) { return b.name.localeCompare(a.name); };      
    } else if (aOrder == FAVTAGS_ORDER_USER) {
       func = null;
    }

    if (func != null) {      
      bookmarks.sort(func);
    }   
  },
  
  
  
  /* deprecated - only used for the conversion */
  _getTagsToolbarBag: function () {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                      getService(Components.interfaces.nsIPrefBranch);
    
    var name = BAG_TAGSTOOLBAR;
    var bags = YBJSON.parse(prefs.getCharPref("extensions.ybookmarks@yahoo.bags"));
    
    for (var i=0; i < bags.length; i++) {
      if (bags[i].name == name) {
        if (bags[i].tags == null) {
          bags[i].tags = [];
        }
        return bags[i];
      }
    }
    return null;
    
  }
  
};

window.addEventListener("load",
                          function() { ybBags.onLoad(); },
                          false);
  