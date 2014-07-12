// $Id: bundleEditor.js 366 2010-08-17 15:20:21Z vivekmb $

const YB_BUNDLE_URI = "bundle:"

var ybBundleEditor = {
  _callback:        null,
  _strings:         null,
  _sqliteStore:     null,
  _syncService:     null,
  _selectedItem:    null,
  _bundles:         null,
  _bundlesToDelete: null,
  
  onLoad: function() {
    try {
    	this._callback = window.arguments[0];
      this._strings = document.getElementById("ybookmarks-strings");
	    this._sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
					  getService(Components.interfaces.nsIYDelLocalStore);
      this._syncService = Components.classes["@mozilla.org/ybookmarks-sync-service;1"].
          getService(Components.interfaces.nsIYBookmarkSyncService);
      //this._bundles = this.getBundles();
      this._bundlesToDelete = [];
	    this.refreshBundleList();
	    
	    // this unhiding and rehiding is a necc kludge for the proper sizing of the list rows
	  /*  var list = document.getElementById("ybBundleEditor-bundle-list");
	    var item;
	    if (list.getRowCount() > 0) {
	      item = list.getItemAtIndex(0);
	      item.childNodes[0].select();
	      item.childNodes[1].select();
	    }
	   
	    this.focusBundleTextbox();
	   
      if (item) {
	      item.childNodes[0].deselect();
	      item.childNodes[1].deselect();
	    }*/
	  } catch (e) {
      yDebug.print("ybBundleEditor.onload(): " + e);
    } 
  },
  
  callback: function() {
    if (this._callback) {
      this._callback.onUpdate();
    }
  },
  
  onDialogAccept: function() {
    
    dupeBundle = this.checkForDupliateBundles();
    if (dupeBundle) {
      var name = dupeBundle.childNodes[0].value;
      this.popupBundleAlreadyExistsDialog(name);
      this.selectBundle(name, true);
      return false;
    } else {
      this.setBundles();
      this.callback();
      return true;
    }
  },
  
  createListItem: function(aBundle) {
    try {
      var bundleItem = document.createElement("listitem");
      bundleItem.setAttribute("allowevents", true);    
      bundleItem.setAttribute("bundle", aBundle.name);
      
      var tags = aBundle.tags.join(" ");
      tags = tags ? tags : "";    
    
      var bundleCell = document.createElement("listcell");
      bundleCell.setAttribute("class", "editable yb-bundle-item");
      bundleCell.setAttribute("label", aBundle.name);
      
      var tagsCell = document.createElement("listcell");
      tagsCell.setAttribute("class", "editable-tagautocomplete yb-tag-item");
      tagsCell.setAttribute("label", tags);
  
      var orderCell = this._createOrderSelection(aBundle.order);
      
      bundleItem.appendChild(bundleCell);
      bundleItem.appendChild(tagsCell);
      bundleItem.appendChild(orderCell);
      
      return bundleItem;
    } catch (e) {
      yDebug.print("ybBundleEditor.createListItem():" + e);
    }
  },
  
  _createOrderSelection: function (aOrder) {
     try {
     var orderCell = document.createElement("listcell");
     var orderMenuList = document.createElement("menulist");
     var orderMenuPopup = document.createElement("menupopup");
     orderCell.setAttribute("allowevents", true);

     for (var i=0; i < FAVTAGS_ORDER.length; i++) {
       var label = this._strings.getString(FAVTAGS_ORDER[i].label);
       var menuItem = document.createElement("menuitem");
       menuItem.setAttribute("label", label);
       menuItem.setAttribute("value", FAVTAGS_ORDER[i].key);
       orderMenuPopup.appendChild(menuItem);
     }

     orderMenuList.setAttribute("sizetopopup", false);
     orderMenuList.appendChild(orderMenuPopup);
     orderCell.appendChild(orderMenuList);
     if (aOrder) {
       orderMenuList.setAttribute("value", aOrder);
     } else {
       orderMenuList.setAttribute("value", FAVTAGS_ORDER_DEFAULT);
     }
     return orderMenuList;
   } catch(e) { yDebug.print("ybBundleEditor.createOrderSelection(): " + e);}
   },
   
  onBundleSelect: function(event, listbox) {
  
    var selectedItem = listbox.selectedItem;
    if (selectedItem == this._selectedItem) {
      return;
    }
    if (this._selectedItem) {
      this._selectedItem.childNodes[0].deselect();
      this._selectedItem.childNodes[1].deselect();
    }
    if (selectedItem) {
      selectedItem.childNodes[0].select();
	    selectedItem.childNodes[1].select();
    }
	  this._selectedItem = selectedItem;    
  },
  /*
  unfocusSelectedItem: function() {
    if (this._selectedItem) {
      var oldCell = this._selectedItem.childNodes[1];
      var oldInput = oldCell.childNodes[1];
      var oldLabel = oldCell.childNodes[2];
      oldInput.setAttribute("hidden", true);  
      oldLabel.setAttribute("hidden", false);
      this._selectedItem = null;
    }
  },
  */
  onNameInputFocus: function(event){
    var list = document.getElementById("ybBundleEditor-bundle-list");
    if (list.selectedItem) {
      this._selectedItem.childNodes[0].deselect();
      this._selectedItem.childNodes[1].deselect();
      this._selectedItem = null;
      list.selectedIndex = -1;
    }
  },
/*
  onListItemBlur: function(event) {
    try {
      var input = event.target.parentNode.parentNode.parentNode;
	    var label = input.parentNode.childNodes[2];
      label.value = input.value;
      label.setAttribute("hidden", false);
      input.setAttribute("hidden", true);
    } catch (e) { 
      yDebug.print("ybBundleEditor.onListItemBlur:() " + e);
    }
    
  },
  */
  /*
  onTagsInputKeydown: function(event) {
    try {
      switch(event.keyCode) {
        case event.DOM_VK_RETURN:  //enter
          var input = event.target;
          if (!input.areSuggestionsVisible) {
            var tags = ybBundleEditor._normalizeTags(input.value);
            if (tags) {
              var label = input.parentNode.childNodes[2];
              var order = input.parentNode.parentNode.childNodes[2].selectedItem;
              var bundleName = input.parentNode.parentNode.getAttribute("bundle");
              //yDebug.print(bundleName + ": " + tags + " : " + order.value);
              input.value = tags;
              label.value = tags;
            
              ybBundleEditor.setBundle(bundleName, tags, order.getAttribute("value"));
              ybBundleEditor.refreshBundleList();
            }
          }
          break;
     
        default:
      }
    } catch (e) { 
      yDebug.print("ybBundleEditor.onTagsInputKeydown(): " + e);
    }
    
  },
  */
  /**
   * @param optional argument: the tag to select
   */
  refreshBundleList: function(aBundle) {
    try {
      var bundles = this.getBundles();//this._bundles;
      //bundles.sort(function(a,b) { return a.name.localeCompare(b.name); });
  /*    yDebug.print("*********************************************");
      for (var i=0; i < bundles.length; i ++) {
        yDebug.printObject(bundles[i]);
      }*/
      
      var list = document.getElementById("ybBundleEditor-bundle-list");
      while(list.getRowCount()) {
        list.removeItemAt(0);
      }
      if (bundles.length > 0) {
        for (var i=0; i < bundles.length; i++) {
          var bn = bundles[i];
          //if (!bn.toDelete) {
            var item = this.createListItem(bn);
            list.appendChild(item);
          //}
        }
        this.selectBundle(aBundle);
     
      }
      //this.callback();

    } catch(e) { 
      yDebug.print("ybBundleEditor.refreshBundleList: " + e);
    }
  },
  
  focusBundleTextbox: function() {
    var textbox = document.getElementById("ybBundleEditor-bundle-name-input");  
    textbox.focus();
  },
  
  selectBundle: function (aBundle, aFocusName) {
    try {
      
      var list = document.getElementById("ybBundleEditor-bundle-list");  
      var item = this._bundleExists(aBundle);
      if (item) {
        list.ensureElementIsVisible(item);
        list.selectItem(item);
        // don't set this._selectedItem
        if (aFocusName) {
          setTimeout(function() { list.selectedItem.childNodes[0].focus(); }, 100);
        } else {
          setTimeout(function() { list.selectedItem.childNodes[1].focus(); }, 100);    
        }
      } else {
        list.selectItem(null);
        this.focusBundleTextbox();
      }
    
    } catch (e) {
      yDebug.print("ybBundleEditor.selectBundle(): " + e.stack);
    }
  },
  
  _strArrayContains : function(aArray, aThing) {
    for (var i=0; i < aArray.length; i++) {
      if (aArray[i].toLowerCase() == aThing.toLowerCase()) {
        return true;
      }
    }
    return false;
  },
  
  _normalizeBundleName: function(aBundle) {
    var nor = aBundle.replace(/\s+/g, "");
  
    return nor;
  },
  
  _normalizeTags: function(aTags) {
    
    var tags = aTags.replace(/^\s+/, "");
    tags = tags.replace(/\s+$/, "");
    tags = tags.replace(/\s+/g, " ");
    tags = tags.toLowerCase();
    return tags;
  },

  getBundles: function() {
      return this._sqliteStore.getBundles({}).map(ybookmarksUtils.nsBundleToJs);
  },
  
  getBundle: function(aBundle) {
    return this._sqliteStore.getBundle(aBundle);
  },
  
  addDeleteTransaction: function(aBundle) {
    this._sqliteStore.addTransaction("deleteBundle", 0, "bundle", YBJSON.stringify({name: aBundle}));            
  },
  
  setBundles: function () {
    try {
      this._sqliteStore.clearBundles();
      
      for (var i=0; i < this._bundlesToDelete.length; i++) {
        this.addDeleteTransaction(this._bundlesToDelete[i]);
      }
      
      var list = document.getElementById("ybBundleEditor-bundle-list");
      
      for (var i=0; i < list.getRowCount(); i++) {
        var bundleItem = list.getItemAtIndex(i);
        var origName = bundleItem.getAttribute("bundle");
        var newName = bundleItem.childNodes[0].value;
        var tags = bundleItem.childNodes[1].value;
        
        if (origName != newName) {
          this.addDeleteTransaction(origName);
        }
        
        var norTags = this._normalizeTags(tags);
        if (norTags) {
          var order = bundleItem.childNodes[2].value;
          var tagArg = ybookmarksUtils.jsArrayToNs(norTags.split(" "));

          yDebug.print(newName + " : " + origName + " : " + norTags +  ":" + order);

          this._sqliteStore.setBundle({name:  newName,
                                        tags:  tagArg,
                                        order: order,
                                        position: i });
                                        
          this._sqliteStore.addTransaction("setBundle", 0, "bundle", YBJSON.stringify({name: newName, tags: norTags}));
        }
      }
      setTimeout(this._syncService.processTransactions, 0);
    } catch (e) {
      yDebug.print("ybBundlesEditor.setBundles(): " + e);
    }
  },
  
  _bundleExists: function(aBundle) {
    try {
    var list = document.getElementById("ybBundleEditor-bundle-list");
    if (aBundle) {
      aBundle = aBundle.toLowerCase();

      for(var i=0; i < list.getRowCount(); i++) {
        var item = list.getItemAtIndex(i);
        if (item.childNodes[0].value.toLowerCase() == aBundle) {
            return item;
        }
      }
    }
    
    return null;
  } catch(e) {
    yDebug.print("_bundleExists(): " + e);
  }
  },
  
  _inCache: function(aBundle) {
    for (var i=0; i < this._bundles.length; i++) {
      if (this._bundles[i].name.toLowerCase() == aBundle.toLowerCase()) {
        return this._bundles[i];
      }
    }
    return null;
  },
  
  addBundle: function() {
    try {
      var inputName = document.getElementById("ybBundleEditor-bundle-name-input");
      
      var bundleName = this._normalizeBundleName(inputName.value);
      /*if (bundleName && !this._inCache(bundleName)) {
        var bundle = { name: bundleName,
                       tags: [] };
        this._bundles.push(bundle);
        inputName.value = "";

        //this.refreshBundleList(bundleName); 
        */
      if (bundleName && !this._bundleExists(bundleName)) {
        inputName.value = "";
      
        var b = { name: bundleName,
                  tags: [],
                  order: null};
        var listItem = this.createListItem(b);
        var list = document.getElementById("ybBundleEditor-bundle-list");
        list.appendChild(listItem);
        list.ensureElementIsVisible(listItem);
        this.selectBundle(bundleName);
      } else {
        if ( bundleName != "") {
          this.popupBundleAlreadyExistsDialog(bundleName);
        }
        this.focusBundleTextbox();
      }
    } catch(e) { 
      yDebug.print("ybBundleEditor.addBundle(): " + e);
    }
  },
  
  canDeleteBundle: function() {
  	var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                  getService(Components.interfaces.nsIPrefBranch);
  	var remindCheck = prefs.getBoolPref("extensions.ybookmarks@yahoo.bundles.warn.delete");
    if (remindCheck) {    	
  	  var strings = document.getElementById("ybookmarks-strings");
  	  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
  	                        getService(Components.interfaces.nsIPromptService);
  	  var title = strings.getString("extensions.ybookmarks.product.name");
  	  var text = strings.getString("extensions.ybookmarks.bundles.editor.bundle.delete.warn.text");
  	  var remind = strings.getString("extensions.ybookmarks.bundles.editor.bundle.warn.remind.text");    
      remindCheck = { value: true };
      var promptFlags = (promptService.BUTTON_TITLE_YES * promptService.BUTTON_POS_0) +
                        (promptService.BUTTON_TITLE_NO * promptService.BUTTON_POS_1) +
                        promptService.BUTTON_POS_1_DEFAULT;
  	  var delBundle = promptService.confirmEx(window, title, text, promptFlags, "", "", "", remind, remindCheck);
      if (!remindCheck.value) {
        prefs.setBoolPref("extensions.ybookmarks@yahoo.bundles.warn.delete", false);
      }      
      //Bug in firefox :: https://bugzilla.mozilla.org/show_bug.cgi?id=345067 
      //Even on closing the dialog box with "X" in titlebar gives return value 1.
  	  if (delBundle == 1) {
	      return false;
  	  } 
    }
    return true;
  },
  
  deleteBundle: function() {  	
    try {
      if(!this.canDeleteBundle()) { //Ask permission from user b4 deleting
      	return;
      }
      var list = document.getElementById("ybBundleEditor-bundle-list");
      var selectedItem = list.selectedItem;
    	if (!selectedItem) { return; }
    	
    	var bundle = selectedItem.getAttribute("bundle");
    	var nextBundle = list.getNextItem(selectedItem, 1);
    	if (!nextBundle) {
    	  nextBundle = list.getPreviousItem(selectedItem, 1);
    	}
    	if (nextBundle) {
    	  nextBundle = nextBundle.getAttribute("bundle");
    	}
      
      this._bundlesToDelete.push(bundle);
      list.removeChild(selectedItem);
      this.selectBundle(nextBundle);
        
	  } catch (e) { 
      yDebug.print("ybBundleEditor.deleteBundle()" + e);
    }
  },
  
  moveBundle: function(aDirection) {
    try {
    	var list = document.getElementById("ybBundleEditor-bundle-list"); 
    	
    	var selIndex = list.selectedIndex;
	    if (selIndex < 0) { return; }
	    
	    var selItem = list.getItemAtIndex(selIndex);
	    var name = selItem.childNodes[0].value;

      if (aDirection == "down" && selIndex < list.getRowCount() - 1) {  
        var next = list.removeItemAt(selIndex + 1);
        list.insertBefore(next, selItem);
    
      } else if (aDirection == "up" && selIndex > 0) {
        /* this convoluted way of moving the item up is due two factors:
           1. there's no insertAfter
           2. removing the selectedItem from the listbox screws up the focusing
           Hence, we want to "move" the item up without actually removing said item. bah. 
         */ 
        var prev = list.removeItemAt(selIndex - 1);
        if (selIndex < list.getRowCount()) {
            var next = list.getItemAtIndex(selIndex);
            list.insertBefore (prev, next);
        } else {
          list.appendChild(prev);
        }
        //list.ensureElementIsVisible(selItem);
      
	    } else {
	      return;
	    }
	    	    
	    this.selectBundle(name);
	    
    } catch (e) {
      yDebug.print("ybBundleEditor.moveBundle(): " + e);
    }
  },
  
  _makeBundleUrl: function(aBundle) {
    return YB_BUNDLE_URI + aBundle;
  },
  
  checkForDupliateBundles: function() {
    var list = document.getElementById("ybBundleEditor-bundle-list");

    var db = {};
    for (var i=0; i < list.getRowCount(); i++) {
      var item = list.getItemAtIndex(i);
      var name = item.childNodes[0].value;
      if(db[name]) {
        return item;
      } else {
        db[name] = item;
      }
    }
    
    return null;
  },
  
  popupBundleAlreadyExistsDialog: function(aBundle) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
           getService(Components.interfaces.nsIPromptService);
    var title = this._strings.getString("extensions.ybookmarks.bundles.editor.bundle.exists.title");
    var text = this._strings.getFormattedString("extensions.ybookmarks.bundles.editor.bundle.exists.text", [ aBundle ]);
    promptService.alert(this, title, text);
  }
  
};

window.addEventListener("load",
                          function() { ybBundleEditor.onLoad(); },
                          false);
