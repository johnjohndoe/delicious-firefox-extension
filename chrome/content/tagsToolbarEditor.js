var TOOLBAR_TAGSVIEW_BAG = "Tags Toolbar";
var YBTOOLBAR_UP = 1;
var YBTOOLBAR_DOWN = 0;
var TOOLBAR_LIST_FIRSTITEM_INDEX = 2;
                      
var ybTagsToolbarEditor = {
  _callback: null,
  _strings: null,
  _tagsToDelete: null,
  
  onLoad: function() {
    
     try {
	    
	    	this._callback = window.arguments[0];
	      this._strings = document.getElementById("ybookmarks-strings");
		    var tags = ybBags.getFavoriteTags().map(function(tag) { return { tag: tag, 
		                                                                       order: ybBags.getFavoriteTagOrder(tag)};}
		                                             );
		    this._tagsToDelete = [];
		    var list = document.getElementById("ybTagsToolbarEditor-tags-list");
	      for (var i=0; i < tags.length; i++) {
	          var item = this.createListItem(tags[i]);        
	          list.appendChild(item);
        }
	      
	      this.focusTagInputTextbox();
	   
      /**
       * Hack to hide value column and show only comments column
       
      document.getElementById("ybTagsToolbarEditor-tags-input").popup.treecols.firstChild.hidden = true;
       */
      /**
       * Change forecolor to blue
       
      document.getElementById("ybTagsToolbarEditor-tags-input").popup.tree.childNodes[1].style.color = "blue";
       */
      } catch (e) { 
        yDebug.print("ybTagsToolbarEditor.onLoad(): " + e);
    	}
  },
  
  _createOrderSelection: function (order) {
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
    
    orderMenuList.appendChild(orderMenuPopup);
    orderCell.appendChild(orderMenuList);
    orderMenuList.setAttribute("value", order);
    return orderMenuList;
  } catch(e) { yDebug.print(e);}
  },
  
  createListItem: function(aTag) {
    try {
    var xulElement = document.createElement("listitem");
    xulElement.setAttribute("allowevents", true);    
    xulElement.setAttribute("value", aTag.tag);    
  
    var tagCell = document.createElement("listcell");
    tagCell.setAttribute("label", aTag.tag);
    tagCell.setAttribute("class", "listcell-iconic yb-tag-item");
    
    var orderCell = this._createOrderSelection(aTag.order);
    xulElement.appendChild(tagCell);
    xulElement.appendChild(orderCell);
    return xulElement;
  }catch (e) {yDebug.print(e);}
  },
  
  callback: function() {
    if (this._callback) {
      this._callback.onUpdate();
    }
  },
  
  focusTagInputTextbox: function() {
    var textbox = document.getElementById("ybTagsToolbarEditor-tags-input");  
    textbox.focus();
  },

  _tagExists: function(aTag) {
    try {
    var list = document.getElementById("ybTagsToolbarEditor-tags-list");
    aTag = aTag.toLowerCase();

    for(var i=0; i < list.getRowCount(); i++) {
      var item = list.getItemAtIndex(i);
      var cTag = item.childNodes[0].getAttribute("label");
      if (cTag && (cTag.toLowerCase() == aTag)) {
        return item;
      }
    } 
  
    return null;
  } catch(e) {
    yDebug.print("_tagExists(): " + e);
  }
  },

  selectTag: function (aTag) {
    try {
      var list = document.getElementById("ybTagsToolbarEditor-tags-list");
	    
	    if (aTag) {
	      var item = this._tagExists(aTag);
	      if (item) {
	        list.ensureElementIsVisible(item);
	        list.selectItem(item);
	      } else {
	        list.selectedIndex = -1;
	      }
	    } else {
	      list.selectedIndex = -1;
      }
    } catch (e) {
      yDebug.print("selectTag(): " + e);
    }
  },
  
  _arrayContains : function(aArray, aThing) {
    for (var i=0; i < aArray.length; i++) {
      if (aArray[i] == aThing) {
        return true;
      }
    }
    return false;
  },
  
  /* follow the rules for tags for favorite tags => no spaces and all lower case*/
  normalizeInputString: function(aString) {    
    var tag = null;
    //var tagArray = aString.toLowerCase().split(" ");
    var tagArray = aString.split(" ");
    for(var i =0; i < tagArray.length; ++i) {
        if(!tagArray[i] || (tagArray[i] == " ")) {
            continue;
        }
        if(!tag) {
            tag = tagArray[i];            
        }  else {
            tag += " " + tagArray[i];
        }
    }
    return tag;
  },


  addTag: function() {
    try {
      var textbox = document.getElementById("ybTagsToolbarEditor-tags-input");
      var tag = this.normalizeInputString(textbox.value);
     
      if (tag && !this._tagExists(tag)) {
        var list = document.getElementById("ybTagsToolbarEditor-tags-list");
        var item = this.createListItem({tag: tag,
                                        order: FAVTAGS_ORDER_DEFAULT});
        list.appendChild(item);
        textbox.value = "";
      }
    
      this.focusTagInputTextbox();    
    
    } catch(e) { 
      yDebug.print("ybTagsToolbar.addTag(): " + e);
    }
  },
  
  deleteTag: function() {
    try {
      var list = document.getElementById("ybTagsToolbarEditor-tags-list");
      var selectedItem = list.selectedItem;
    	if (!selectedItem) { return; }
    
    	var tag = selectedItem.getAttribute("value");
    	var nextTag = list.getNextItem(selectedItem, 1);
    	if (!nextTag) { 
    	  nextTag = list.getPreviousItem(selectedItem, 1);
    	}
    	
    	if (nextTag) {
    	  nextTag = nextTag.getAttribute("value");
    	}
  
      this._tagsToDelete.push(tag);
      list.removeChild(selectedItem);
      
      this.selectTag(nextTag);

	  } catch (e) { 
      yDebug.print("ybTagsToolbar.deleteTag(): " + e);
    }
    
  },
  
  moveTag: function(aDirection) {
    try {
    	var list = document.getElementById("ybTagsToolbarEditor-tags-list"); 
    	var selIndex = list.selectedIndex;
	    if (selIndex < 0) { return; }
	    
	    var selItem = list.getItemAtIndex(selIndex);
	    var name = selItem.childNodes[0].getAttribute("label");

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
      
	    } else {
	      return;
	    } 
	    ybTagsToolbarEditor.selectTag(name);
    	
    } catch (e) {
      yDebug.print("moveTag(): " + e);
    }
  },
  
  _favoriteTagExists: function (aTags, aTag) {
    for (var i=0; i < aTags.length; i++) {
      if (aTags[i] == aTag) {
        return true;
      }
    }
    return false;
  },
  
  setTags: function() {
    try {
	    for (var i=0; i < this._tagsToDelete.length; i++) {
	      var tag = this._tagsToDelete[i];
	      ybBags.deleteFavoriteTag(tag);
	    }
	
	    var oldTags = ybBags.getFavoriteTags();
	    var list = document.getElementById("ybTagsToolbarEditor-tags-list"); 
  	                                                                 
	    for (var i=0; i < list.getRowCount(); i++) {
	      var item = list.getItemAtIndex(i);
	      var tag = item.childNodes[0].getAttribute("label");
	      var order = item.childNodes[1].value;
	      
	      if (!this._favoriteTagExists(oldTags, tag)) {
	        ybBags.addFavoriteTag(tag);
	      }
	      ybBags.setFavoriteTagOrder(tag, order);
	      ybBags.moveFavoriteTag(tag,i+1); // 1 based
	    }
        ybBags.saveFavoriteTags();
    } catch (e) {
      yDebug.print("tagsToolbarEditor.setTags(): " + e);
    }
  },

  onDialogAccept: function() {
     try {
     	 this.setTags();
	     this.callback();
	     return true;
     } catch (e) { 
     
      yDebug.print("onDialogAccept" + e);
     }
     
   }
};

window.addEventListener("load",
                          function() { ybTagsToolbarEditor.onLoad(); },
                          false);