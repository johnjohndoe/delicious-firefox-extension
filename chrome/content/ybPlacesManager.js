function overridePlacesView () {
	try {
	  PlacesTreeView.prototype.COLUMN_TYPE_IMPORTED = 10;
	
	  PlacesTreeView.prototype._getColumnType = function PTV__getColumnType(aColumn) {
	    var columnType = aColumn.element.getAttribute("anonid") || aColumn.id;
	    switch (columnType) {
	      case "title":
	        return this.COLUMN_TYPE_TITLE;
	      case "url":
	        return this.COLUMN_TYPE_URI;
	      case "date":
	        return this.COLUMN_TYPE_DATE;
	      case "visitCount":
	        return this.COLUMN_TYPE_VISITCOUNT;
	      case "keyword":
	        return this.COLUMN_TYPE_KEYWORD;
	      case "description":
	        return this.COLUMN_TYPE_DESCRIPTION;
	      case "dateAdded":
	        return this.COLUMN_TYPE_DATEADDED;
	      case "lastModified":
	        return this.COLUMN_TYPE_LASTMODIFIED;
	      case "tags":
	        return this.COLUMN_TYPE_TAGS;
	      case "imported":
	  	    return this.COLUMN_TYPE_IMPORTED;
	    }
	    return this.COLUMN_TYPE_UNKNOWN;
	  };
	      
	  PlacesTreeView.prototype.getImageSrc = function PTV_getImageSrc(aRow, aColumn) {
	  try {
	    this._ensureValidRow(aRow);
	
	    // only the title column has an image
	    if (this._getColumnType(aColumn) != this.COLUMN_TYPE_TITLE && this._getColumnType(aColumn) != this.COLUMN_TYPE_IMPORTED)
	      return "";
	    
	    var node = this._visibleElements[aRow].node;
	    var icon = node.icon;
	    
	    if(this._getColumnType(aColumn) == this.COLUMN_TYPE_TITLE) {
			    
	        return icon ? icon.spec : "";
	    } else if(this._getColumnType(aColumn) == this.COLUMN_TYPE_IMPORTED) {
		    var sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
				          getService(Components.interfaces.nsIYDelLocalStore);
	  	    if(PlacesUtils.nodeIsBookmark(node) && sqliteStore.isBookmarked(node.uri))
	  		    return "chrome://ybookmarks/skin/import-arrow.gif";
	  	    else if(PlacesUtils.nodeIsLivemarkContainer(node) && sqliteStore.isBookmarked(PlacesUtils.livemarks.getFeedURI(node.itemId).spec))
	  		    return "chrome://ybookmarks/skin/import-arrow.gif";
	    }
	    } catch(e) {
	    
	    }
	  };
	} catch (e) {  }

}

function ybStartup() {
    try {
   		if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)  {
      		return true;
      	}
		
		overridePlacesView();
		
        var importIcon = null;
        if(ybookmarksUtils.getPlatform() == YB_PLATFORM_MAC) {
            importIcon = document.getElementById("ybImportFF3-OSX");
        } else {
      	    importIcon = document.getElementById("ybImportFF3");
      	}
      	if(importIcon) {
      		importIcon.hidden = false;
      	}
 
      	if( !YBidManager.isUserLoggedIn() ) {
      		return true;
      	}

      	/**
      	 * Add imported column to result tree
      	 */
      	var strings       = document.getElementById("yb-places-strings");
      	var placesTreeCols = document.getElementById("placeContentColumns");
      	var firstColm = placesTreeCols.firstChild;

      	var splitter = document.createElement("splitter");
		splitter.setAttribute("class","tree-splitter");
		
      	var treeCol = document.createElement("treecol");
      	treeCol.setAttribute("anonid","imported");
      	treeCol.setAttribute("label",strings.getString("extensions.ybookmarks.placesManager.imported"));
      	treeCol.setAttribute("persist","width hidden ordinal sortActive sortDirection");
      	
      	placesTreeCols.insertBefore(treeCol, firstColm.nextSibling);
      	placesTreeCols.insertBefore(splitter, firstColm.nextSibling);

    } catch (e) {
      yDebug.print("ybPlacesManager.ybStartup(): " + e, YB_LOG_MESSAGE);
    }

    //Call to builtin Mozilla code.
    //setTimeout(Startup, 100);
}


var yb_importChecker = {

_showImportoptions: function(bookmarks) {
    
    var callback = {        
        
        _bookmarks : null,
                        
        onload: function(result) {
            var propertyBag = result.queryElementAt(0, Components.interfaces.nsIPropertyBag);
            var status = propertyBag.getProperty("status");  
            var strings = document.getElementById("yb-strings"); 
            if (status == "importing") {           	    
                //Show MessageBox. 
           	    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
			           getService(Components.interfaces.nsIPromptService);
			    var title = strings.getString("extensions.ybookmarks.product.name");
			    var text = strings.getString("extensions.ybookmarks.import.already.running");
			    promptService.alert(this, title, text);
            } else {
                window.openDialog("chrome://ybookmarks/content/importBookmarks.xul", "yb-import-bookmarks", 
                            "chrome,centerscreen", { bookmarks: this._bookmarks });
            }
        },         
        onerror: function() {
            yDebug.print("ybBookmarksManager.yb_importChecker.callback.onerror(): " + e, YB_LOG_MESSAGE);
        }        
        
    };                            
    var ssr = Components.classes["@yahoo.com/socialstore/delicious;1"].
          getService(Components.interfaces.nsISocialStore);             
    callback._bookmarks = bookmarks;
    ssr.getImportStatus(callback); 	                                                        
}

};


function yb_importBookmarks() {
  try {
	  // check if user is logged in
	  if( !YBidManager.isUserLoggedIn() ) {
	     YBidManager.promptUserLogin();
	     return;
	  }

    var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].
                    getService(Components.interfaces.nsIRDFService);

    var rdfContainerUtils = Components.classes["@mozilla.org/rdf/container-utils;1"].
                              getService(Components.interfaces.nsIRDFContainerUtils);

    var sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
				          getService(Components.interfaces.nsIYDelLocalStore);
    
    var strings       = document.getElementById("yb-strings");
    var placeContent = document.getElementById("placeContent");

    /**
     * Get all selected bookmarks
     */
	var bookmarks = [];
	var selNodes = placeContent.getSelectionNodes();
	
	/**
	 * Generate array of objects according to type bookmark or livemark or folder
	 */
	for(i=0; i < selNodes.length; i++) {
		/**
		 * If bookmark check if imported and create object
		 */
		if(PlacesUtils.nodeIsBookmark(selNodes[i])) {
			bookmarks.push(yb_createBookmarkNode(selNodes[i]));
		}
		
		/**
		 * If livemark container fetch feed url and create object
		 */
		else if(PlacesUtils.nodeIsLivemarkContainer(selNodes[i])) {
			if(PlacesUtils.livemarks.isLivemark(selNodes[i].itemId)) {
				bookmarks.push(yb_createLivemarkNode(selNodes[i]));
			}
		}
		
		/**
		 * If folder fetch all child bookmarks and create objects
		 */
		else if(PlacesUtils.nodeIsFolder(selNodes[i])) {
			var contents = PlacesUtils.getFolderContents(selNodes[i].itemId, false, false).root;

	      	for (j=0; j < contents.childCount; ++j) {
				var child = contents.getChild(j);
				
				if(PlacesUtils.nodeIsBookmark(child)) {
					bookmarks.push(yb_createBookmarkNode(child));
				}
				else if(PlacesUtils.nodeIsLivemarkContainer(child) && PlacesUtils.livemarks.isLivemark(child.itemId)) {
					bookmarks.push(yb_createLivemarkNode(child));
				}
			}
		}
	}
	
    if (bookmarks.length > 0) {
       yb_importChecker._showImportoptions(bookmarks);  
       /*window.openDialog("chrome://ybookmarks/content/importBookmarks.xul", "yb-import-bookmarks", 
                            "chrome,centerscreen", { bookmarks: bookmarks });*/
    } else {
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
             getService(Components.interfaces.nsIPromptService);
      var text = strings.getString("extensions.ybookmarks.import.bookmarks.manager.instructions");
      promptService.alert(this, "Delicious", text);
    }
      
  } catch (e) {
    yDebug.print("yb_importBookmarks(): " + e, YB_LOG_MESSAGE);
  }
  
}

function yb_createBookmarkNode(selNode) {
	var sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
				          getService(Components.interfaces.nsIYDelLocalStore);
	
	var node = {};
	
	node.name = selNode.title;
	node.url = selNode.uri;
	node.feelUrl = "";
	node.description = PlacesUIUtils.getItemDescription(selNode.itemId);
	node.shortcutUrl = "";
	node.icon =  (selNode.icon) ? selNode.icon.spec : null;
	node.addDate = (selNode.dateAdded) ? selNode.dateAdded / 1000000 : null;
	node.lastModDate = (selNode.lastModified) ? selNode.lastModified / 1000000 : null;
	node.lastVisitDate = null;
	node.lastCharset = null;
	node.webPanel = false;
	node.imported = sqliteStore.isBookmarked(node.url);

	return node;
}

function yb_createLivemarkNode(selNode) {
    var sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
				          getService(Components.interfaces.nsIYDelLocalStore);
	
	var node = {};
	
	node.name = selNode.title;
	node.url = PlacesUtils.livemarks.getFeedURI(selNode.itemId).spec;
	node.feedUrl = PlacesUtils.livemarks.getFeedURI(selNode.itemId).spec;
	node.description = PlacesUIUtils.getItemDescription(selNode.itemId);
	node.shortcutUrl = "";
	node.icon = (selNode.icon) ? selNode.icon.spec : null;
	node.addDate = (selNode.dateAdded) ? selNode.dateAdded / 1000000 : null;
	node.lastModDate = (selNode.lastModified) ? selNode.lastModified / 1000000 : null;
	node.lastVisitDate = null;
	node.lastCharset = null;
	node.webPanel = false;
	node.imported = sqliteStore.isBookmarked(node.url);

	return node;
}


    

window.addEventListener("load",ybStartup, false);