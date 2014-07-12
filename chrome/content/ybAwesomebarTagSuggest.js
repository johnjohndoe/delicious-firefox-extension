var ybAwesomeBarTagSuggest = {
    attach: function() {
        try {
            var popup = document.getElementById("yb-awesome-bar-tag-suggest");
            popup.setAttribute("onpopupshowing", "gURLBar.addEventListener('keypress', ybAwesomeBarTagSuggest.ybAwesomeBarOnKeypress, false);");
            popup.setAttribute("onpopuphiding", "gURLBar.removeEventListener('keypress', ybAwesomeBarTagSuggest.ybAwesomeBarOnKeypress, false);");
            gURLBar.addEventListener("input", ybAwesomeBarTagSuggest.ybAwesomeBarOnInput, false);
        } catch(e) {
            yDebug.print("Exception in ybAwesomeBarTagSuggest::attach() " + e, YB_LOG_MESSAGE);
        }
    },
    
    pushTagToAwesomeBar: function(rli) {
        try {
            var popup = document.getElementById("yb-awesome-bar-tag-suggest");        
            if(popup) {
                //just check if manually closed and dont do anything if so
                if(popup.state != "open") return;
                popup.hidePopup();
                if(gURLBar) {
                    gURLBar.value = ">>" + rli.getAttribute("value");
                    gURLBar.disableAutoComplete = false;
                    if(gURLBar.value && gURLBar.mController && gURLBar.mController.startSearch) { 
                        setTimeout(gURLBar.mController.startSearch, 0, gURLBar.value);
                    }
                }
            }            
        } catch(e) {
            yDebug.print("Exception in ybAwesomeBarTagSuggest::pushTagToAwesomeBar() " + e, YB_LOG_MESSAGE);    
            
        }
    },
    
    ybAwesomeBarOnKeypress: function(event) {
        try {
            var popup = document.getElementById("yb-awesome-bar-tag-suggest");
            var rlb = document.getElementById("yb-awesome-bar-tag-suggest-richlistbox");
            
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefBranch);
            
            if(!prefs.getBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousTags")) {
                return;
            }
            
            if(!popup || !rlb || (popup.state != "open")) {
                return;
            }
            
            var timeout = prefs.getIntPref("extensions.ybookmarks@yahoo.tagSuggestionWait.interval");
            
            switch(event.keyCode) {
               case event.DOM_VK_DOWN:
                    if(rlb.getItemAtIndex(rlb.selectedIndex) && rlb.getItemAtIndex(rlb.selectedIndex).timer) clearTimeout(rlb.getItemAtIndex(rlb.selectedIndex).timer);
                    if(rlb.selectedIndex == -1) rlb.selectedIndex = 0;
                    else if(rlb.selectedIndex == (rlb.itemCount-1)) rlb.selectedIndex = 0;
                    else rlb.selectedIndex += 1;
                    rlb.getItemAtIndex(rlb.selectedIndex).timer = setTimeout(ybAwesomeBarTagSuggest.pushTagToAwesomeBar, timeout, rlb.getItemAtIndex(rlb.selectedIndex));
                    break;
               case event.DOM_VK_UP:
                    if(rlb.getItemAtIndex(rlb.selectedIndex) && rlb.getItemAtIndex(rlb.selectedIndex).timer) clearTimeout(rlb.getItemAtIndex(rlb.selectedIndex).timer);
                    if(rlb.selectedIndex == -1) rlb.selectedIndex = rlb.itemCount;
                    else if(rlb.selectedIndex == 0) rlb.selectedIndex = rlb.itemCount-1;
                    else rlb.selectedIndex -= 1;
                    rlb.getItemAtIndex(rlb.selectedIndex).timer = setTimeout(ybAwesomeBarTagSuggest.pushTagToAwesomeBar, timeout, rlb.getItemAtIndex(rlb.selectedIndex));
                    break;
               case event.DOM_VK_TAB:
                    ybAwesomeBarTagSuggest.pushTagToAwesomeBar(rlb.selectedItem);
                    event.preventDefault();
                    break;
               default:
                    if(rlb.selectedIndex != -1 && rlb.getItemAtIndex(rlb.selectedIndex).timer) {
                        clearTimeout(rlb.getItemAtIndex(rlb.selectedIndex).timer);
                        rlb.selectedIndex = -1;
                    }
            }
        } catch(e) {
            yDebug.print("Exception in ybAwesomeBarTagSuggest::ybAwesomeBarOnKeypress() " + e, YB_LOG_MESSAGE);
        }
    },
       
    ybAwesomeBarOnInput: function (event) {
        try {
            var popup = document.getElementById("yb-awesome-bar-tag-suggest");
            var rlb = document.getElementById("yb-awesome-bar-tag-suggest-richlistbox");
            
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefBranch);
            
            if(!prefs.getBoolPref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousTags")) {
                return;
            }
            
            
            if(gURLBar.value.indexOf(">>") != 0) {
                gURLBar.disableAutoComplete = false;
                return;
            } else {
                gURLBar.disableAutoComplete = true;
                gURLBar.popup.hidePopup();
            }
               
            var element = rlb.firstChild;
            var nElement;
            while (element) {
              nElement = element;
              element = element.nextSibling;
              rlb.removeChild(nElement);
            }
                    
            delsqlite = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
                    getService(Components.interfaces.nsIYDelLocalStore);
            
            var timeout = prefs.getIntPref("extensions.ybookmarks@yahoo.tagSuggestionWait.interval");
             
            var str = gURLBar.value.substr(2);
            var data = delsqlite.getTagSuggestions(str, true);
            
            for(var i=0; i<data.length && i < 20; i++) {
                var tmp = data.queryElementAt(i, Components.interfaces.nsIWritablePropertyBag);                 
                var lbl = document.createElement("label");
                lbl.setAttribute("value", tmp.getProperty("tag") + " (" + tmp.getProperty("count") + ")");
                var rli = document.createElement("richlistitem");
                rli.setAttribute("value", tmp.getProperty("tag"));
                rli.setAttribute("class", "yb-awesome-bar-richlistitem");
                rli.setAttribute("onmouseover", "this.parentNode.selectedItem = this; this.timer = setTimeout(ybAwesomeBarTagSuggest.pushTagToAwesomeBar,"+timeout+", this);");
                rli.setAttribute("onmouseout", "clearTimeout(this.timer);");
                rli.appendChild(lbl);
                rlb.appendChild(rli);
            }
            
            if(data.length > 0)  {
                gURLBar.popup.hidePopup();
                popup.setAttribute("hidden", "false");
                popup.openPopup(gURLBar, "after_start", 0, 0, false, false);
            }
            else {
                popup.hidePopup();
                popup.setAttribute("hidden", "true");
            }
        } catch(e) {
            yDebug.print("Exception in ybAwesomeBarTagSuggest::ybAwesomeBarOnInput() " + e, YB_LOG_MESSAGE);
        }
    }
}