var CC = Components.classes;
var CI = Components.interfaces;

/**
 *  Class manages all the icons on status bar
 */
function statusBarIcon(id, labelId) {
	this._icon = null;
	this._iconLabel = null;
	this._init(id, labelId);
}

statusBarIcon.prototype = {
	_init: function (id, labelId) {
		try {
			this._icon = document.getElementById(id);
			if(labelId)	this._iconLabel = document.getElementById(labelId);
		} catch (e) {
			yDebug.print("ybookmarkStatusOverlay.js::statusBarIcon::_init()=>Exception: "+e,YB_LOG_MESSAGE);
		}
	},
	setImage: function (url) {
		this._icon.setAttribute("src",url)
	},
	showIcon: function () {
		this._icon.hidden = false;
		this._icon.collapsed = false;
	},
	hideIcon: function () {
		this._icon.hidden = true;
		this._icon.collapsed = true;
	},
	setLabel: function (val) {
		this._iconLabel.value = val;
	},
	showLabel: function () {
		this._iconLabel.style.display = "";
	},
	hideLabel: function () {
		this._iconLabel.style.display = "none";
	}
}


//Changes tag icon color for bookmarked urls 
function changeTagIcon(url) 
{
	if(!url) {
		return;
	}
	var sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
				          getService(Components.interfaces.nsIYDelLocalStore);
  //check for browse bar url
  var bUrl = deliciousService.getBrowseBarUrl();
  var aHash = null;
  var existingBkmk = false;
  
  //make it string so that we can compare
  url = url + "";
  
  if(url &&
  url.indexOf(bUrl) == 0) {  	
  	if(url.indexOf('#') != -1 &&
  	url.lastIndexOf('#') != -1 &&
  	url.lastIndexOf('#') < url.length) {
  		aHash = url.substr(url.lastIndexOf('#')+1);
  	}
  }
  
  if(aHash) {
  	existingBkmk = (sqliteStore.getBookmarkForHash( aHash ) != null);
  } else {
  	existingBkmk = sqliteStore.isBookmarked( url );
  }

    if(existingBkmk) {
      yDebug.print ( "Existing entry for " + url );
      
      //Increment visit count
      sqliteStore.incrementVisitCount(url);
    }
    
    var toolbarTagIcon = document.getElementById("del-button-tagPage");
    var styleClassName = "toolbar-tag-effect";
    var navbar = document.getElementById("nav-bar");
    if(navbar && (navbar.getAttribute("iconsize") == "small")) {
    	styleClassName = "toolbar-tag-effect-small";
    }
    if(toolbarTagIcon) {
        if(existingBkmk) {
            toolbarTagIcon.setAttribute("class", styleClassName);
            toolbarTagIcon.setAttribute("del", "true");
        } else {
            toolbarTagIcon.setAttribute("class", styleClassName);
            toolbarTagIcon.setAttribute("del", "false");
        }
    }
}

/**
 * Listner class for adress bar changes to provide data
 */
var urlBarListener = {
 	
  QueryInterface: function(aIID)
  {
   if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
       aIID.equals(Components.interfaces.nsISupports))
     return this;
   throw Components.results.NS_NOINTERFACE;
  },

  onLocationChange: function(aProgress, aRequest, aURI)
  {
	/**
	 * Before adding new values update old contents to blank
	 */		
	try { 
	    var url =  aProgress.DOMWindow.location.href;
	    changeTagIcon(url);
	} catch(e) {
	    //This is happening on startup at times.
	    yDebug.print("Exception in ybookmarkStatusOverlay.js::urlBarListener::onLocationChange:" +  e, YB_LOG_MESSAGE);
	}	
  },

  onStateChange: function() {},
  onProgressChange: function() {},
  onStatusChange: function() {},
  onSecurityChange: function() {},
  onLinkIconAvailable: function() {}
};

/**
 * Status Bar class handles all the things on status bar
 */
var statusBar = {
	delIcon: null,
	networkIcon: null,
	inboxIcon: null,
	delIconOff: null,
	networkOff: null,
	inboxActive: null,
	prefService: null,
	extBranch: null,
	links4u: 0,
	strbundle: null,
	os: null,
	hash: null,
	networkTimer: null,
	tagReq: null,
	prefsUpdateTimer: null,

	init: function () {
		this.delIcon = new statusBarIcon("delicious-status-bar-delicious-image");
		
		this.networkIcon = document.getElementById("delicious-status-bar-network-image");
		
		this.inboxIcon = new statusBarIcon("delicious-status-bar-inbox-image", "delicious-status-bar-inbox-count");
		this.inboxIcon.hideIcon();
		
		this.strbundle = document.getElementById("ybookmarks-status-bar-strings");
		
		try { 
			this.register();
		} catch(e) { 
			yDebug.print("ybookmarkStatusOverlay.js::statusBar::init()=>Exception: "+e,YB_LOG_MESSAGE);
		}
	},

	register: function () {
		try {
			this.prefService = Components.classes["@mozilla.org/preferences-service;1"]
		                             .getService(Components.interfaces.nsIPrefService);
			
			this.extBranch = this.prefService.getBranch("extensions.ybookmarks@yahoo");
		    this.extBranch.QueryInterface(Components.interfaces.nsIPrefBranch2); 
		    this.extBranch.addObserver("", this, false); 	
		    
		    this.os = Components.classes["@mozilla.org/observer-service;1"]
                                     .getService(Components.interfaces.nsIObserverService);
	        this.os.addObserver ( this, "ybookmark.updateLinks4u", false );
	        this.os.addObserver ( this, "ybookmark.userChanged", false );
	        this.os.addObserver ( this, "ybookmark.updateTagIcon", false );
	        
	        //Listen for webpage loads
	        gBrowser.addProgressListener(urlBarListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
	        
		} catch (e) {
			yDebug.print("ybookmarkStatusOverlay.js::statusBar::register()=>Exception: "+e,YB_LOG_MESSAGE);
		}
	},
	
	unregister: function () {
	    if(this.extBranch) {
		    try {
	    		this.extBranch.removeObserver("", this);
		    } catch (e) {
		    	yDebug.print("ybookmarkStatusOverlay.js::statusBar::unregister()=>Exception: "+e,YB_LOG_MESSAGE);
		    }
	    }
	    
	    if(this.os) {
		    try {
	    		this.os.removeObserver(this, "ybookmark.updateLinks4u");
	    		this.os.removeObserver(this, "ybookmark.userChanged");	    		
	    		this.os.removeObserver(this, "ybookmark.updateTagIcon");	    			    		
		    } catch (e) {
		    	yDebug.print("ybookmarkStatusOverlay.js::statusBar::unregister()=>Exception: "+e,YB_LOG_MESSAGE);
		    }
	    }
	    
	    //remove progress listner
	    gBrowser.removeProgressListener(urlBarListener);
	},
	
	getUpdatedPrefs: function () {
		try {
			this.networkOff = this.prefService.getBoolPref("extensions.ybookmarks@yahoo.statusbaricons.disable_networkreminder");
			this.inboxActive = this.prefService.getBoolPref("extensions.ybookmarks@yahoo.statusbaricons.include_linksforyou");
			this.delIconOff = this.prefService.getBoolPref("extensions.ybookmarks@yahoo.statusbaricons.disable_delicious_icon");
			
			if(this.networkOff && !this.inboxActive && this.delIconOff) {
			    document.getElementById("delicious-status-bar-panel").hidden = true;
			} else {
			    document.getElementById("delicious-status-bar-panel").hidden = false;
			}
		} catch (e) {
			yDebug.print("ybookmarkStatusOverlay.js::statusBar::getUpdatedPrefs()=>Exception: "+e,YB_LOG_MESSAGE);
		}
	},
	
	loadIcons: function () {
		try {
			this.delIcon.setImage("chrome://ybookmarks/skin/deliciousIconSmall.gif");
			if(this.delIconOff) {
				this.delIcon.hideIcon();
			} else {
				this.delIcon.showIcon();
			}
			
			this.inboxIcon.setImage((this.links4u > 0) ? "chrome://ybookmarks/skin/inboxActive.gif" : "chrome://ybookmarks/skin/inboxInactive.gif");
					
			if(this.inboxActive) {
				this.inboxIcon.showIcon();
				if(this.links4u > 0) this.inboxIcon.showLabel();
				
				this.inboxIcon._iconLabel.setAttribute("tooltiptext", this.strbundle.getFormattedString("extensions.ybookmarks.statusbar.links4uIcon.tooltip", [ this.links4u ]));
				this.inboxIcon._icon.setAttribute("tooltiptext", this.strbundle.getFormattedString("extensions.ybookmarks.statusbar.links4uIcon.tooltip", [ this.links4u ]));
				this.inboxIcon._icon.setAttribute("onclick", "ybookmarksUtils.openLinkToNewTab('"+deliciousService.getLinks4uUrl()+"'); statusBar.updateLinks4u();");
				this.inboxIcon._iconLabel.setAttribute("onclick", "ybookmarksUtils.openLinkToNewTab('"+deliciousService.getLinks4uUrl()+"'); statusBar.updateLinks4u();");
			}
			else {
				this.inboxIcon.hideIcon();
				this.inboxIcon.hideLabel();

				this.inboxIcon._iconLabel.removeAttribute("tooltiptext");
				this.inboxIcon._icon.removeAttribute("tooltiptext");
			}
			
		} catch (e) {
			yDebug.print("ybookmarkStatusOverlay.js::statusBar::loadIcons()=>Exception: "+e,YB_LOG_MESSAGE);
		}
	},
	
	reloadNetwork: function () {
		if(statusBar.networkOff) {
			statusBar.networkIcon.hidden = true;
			statusBar.clearNetworkTimer();				
		} else {
			statusBar.networkIcon.hidden = false;
			statusBar.setNetworkTimer();
		}
	},
	
	observe: function (aSubject, aTopic, aData) {
		switch(aTopic) {
			case "nsPref:changed":
				try {
					this.getUpdatedPrefs();
					this.loadIcons();
					this.reloadNetwork();
				} catch (e) {
					yDebug.print("ybookmarkStatusOverlay.js::statusBar::observe()=>Exception: "+e,YB_LOG_MESSAGE);
				}
			break;
			
			case "ybookmark.updateLinks4u":
				this.updateLinks4u(aData);
			break;
			
			case "ybookmark.userChanged":			    
			    if(aData == "loggedin") {
			        statusBar.handleNetwork();
			    	statusBar.setNetworkTimer();
			    } else if(aData == "loggedout" || aData == "cookie_expired" || aData == "silentlogout") {
			    	statusBar.clearNetworkTimer();
			    }
			break;
			case "ybookmark.updateTagIcon":
			    try {			        
			        changeTagIcon(window.content.document.location);			
			    } catch(e) {
			        yDebug.print("ybookmark.updateTagIcon Exception:" + e, YB_LOG_MESSAGE);
			    }
			break;
		}
	},
	
	updateLinks4u: function (links) {
		
		if(!this.inboxActive) {
			this.inboxIcon.hideLabel();
			return;
		}
		
		this.links4u = (!links)?0:links;
		
		if(this.links4u <= 0) {
			this.inboxIcon.hideLabel();
		}
		else {
			this.inboxIcon.setLabel(this.links4u);
			this.inboxIcon.showLabel();
		}
		
		this.loadIcons();
	},
	
    activateNetworkIcon : function() {
    	statusBar.networkIcon.setAttribute("status", "active");
    	statusBar.networkIcon.setAttribute("tooltiptext", statusBar.strbundle.getString("extensions.ybookmarks.statusbar.network.active.tooltip"));				    	
    },
    
    inactivateNetworkIcon : function() {
    	statusBar.networkIcon.setAttribute("status", "inactive");
    	statusBar.networkIcon.setAttribute("tooltiptext", statusBar.strbundle.getString("extensions.ybookmarks.statusbar.network.inactive.tooltip"));				    	
    },
    
	
	handleNetwork : function () {
	    if(deliciousService.getUserName()) {	
	    	var cb = {
		      onload : function(posts) {		      	
		      	if(!posts) {		      		
		      		return;   	
		      	}		
		      		      	      	
		      	//yDebug.print("valid post,length:"+ posts.length);
		      	var rssDOM = posts.queryElementAt(0, Components.interfaces.nsIDOMDocument);
		      	var timeArray = ybookmarksUtils.evaluateXPath(rssDOM,"//item[1]/pubDate");
 		    	var time = null;
			    if(timeArray && timeArray[0]) {
			    	time = timeArray[0].textContent;
			    }	  
		        //Do this only if user is logged in
		      	if(time && deliciousService.getUserName()) {
			        var sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
				          getService(Components.interfaces.nsIYDelLocalStore);
				    var lastTime = sqliteStore.getFeedLastUpdateTime(deliciousService.getNetworkFeedUrl());
				    //Show the icon,There is some nw activity
				    if(!lastTime) {
				    	statusBar.activateNetworkIcon();
				    } else if(time != lastTime) {
				    	statusBar.activateNetworkIcon();
				    }		    
		      	}		      	
		      },
		      onerror : function(event) {
		      	yDebug.print("ybookmarksStatusOverlay.js:handleNetwork:Onerror",YB_LOG_MESSAGE);		      	
		      }
		    }
			var socialStore = Components.classes["@yahoo.com/socialstore/delicious;1"].
		                            getService(Components.interfaces.nsISocialStore);            
			socialStore.getFeedData(deliciousService.getNetworkFeedUrl(), cb);
	    }
	},

	onNetworkClick: function () {
		//Make icon inactive
		statusBar.inactivateNetworkIcon();		
		//Open the network page.		
	    ybookmarksUtils.openLinkToNewTab(deliciousService.getNetworkUrl());
	    
		var cb = {
	      onload : function(posts) {	      	
	      	if(!posts) {		      		
		      	return;   	
		    }		      	
			var rssDOM = posts.queryElementAt(0, Components.interfaces.nsIDOMDocument);			
		    var timeArray = ybookmarksUtils.evaluateXPath(rssDOM,"//item[1]/pubDate");
		    var time = null;
		    if(timeArray && timeArray[0]) {
		    	time = timeArray[0].textContent;
		    }		    
	      	if(time && deliciousService.getUserName()) {
		        var sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
				          getService(Components.interfaces.nsIYDelLocalStore);
			    sqliteStore.setFeedLastUpdateTime(deliciousService.getNetworkFeedUrl(), time);
	      	}      		
	      },
	      onerror : function(event) {
	      	yDebug.print("ybookmarksStatusOverlay.js:OnNetworkClick:Onerror",YB_LOG_MESSAGE);
	      }
	    }	
	    //Do this only if user is logged in
	    if(deliciousService.getUserName()) {	
			//Get the latest timestamp
			var socialStore = Components.classes["@yahoo.com/socialstore/delicious;1"].
		                            getService(Components.interfaces.nsISocialStore); 
			socialStore.getFeedData(deliciousService.getNetworkFeedUrl(), cb);
	    }
	},

	setNetworkTimer : function () {
		//User must be logged in.
		if(!deliciousService.getUserName()) {
			return;
		}		
		
	    //default to 10 minutes
	    yDebug.print("ybookmarksStatusOverlay.js::setNetworkTimer",YB_LOG_MESSAGE);
		var interval = 60*10; //seconds => 10 minutes
		try {
			interval = this.prefService.getIntPref("extensions.ybookmarks@yahoo.statusbaricons.networkpoll.interval");
		} catch(e) {}		
		statusBar.clearNetworkTimer();
		if (!statusBar.networkTimer) {		  
	      statusBar.networkTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	    } else {	    
	      statusBar.networkTimer.cancel();
	    }	    
	    statusBar.networkTimer.initWithCallback(this, interval * 1000,
                                                 Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
	},
	
	clearNetworkTimer : function () {
		if(statusBar.networkTimer) {
			statusBar.networkTimer.cancel();
			statusBar.networkTimer = null;
		}		
	},
	
	notify : function (aTimer) {
		
		if (aTimer == statusBar.networkTimer){
			yDebug.print("ybookmarksStatusOverlay.js:notify=> Network Timer notified.",YB_LOG_MESSAGE);
			statusBar.handleNetwork();
		}
	},
	
	loadStatusBar : function () {
		
		//:::Classic or FullMode:::	    
	    if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)  {
	    	//Toolbar removal
	    	var element = document.getElementById("navigator-toolbox");
			if(element.hasChildNodes()){
				for (var i = 0; i < element.childNodes.length; i++) {
				  if(element.childNodes[i].id == "ybToolbar") {
				  	element.removeChild(element.childNodes[i]);
				  	break;
				  }
				}
			}
			//Hide sidebar button for classic mode.
    		var sidebarButton = document.getElementById("del-button-delicious");
    		if(sidebarButton) {	    		
   				sidebarButton.hidden = true;
    		}			
			return false;
	    } else {	    	
	    	var showList = [ "delicious-status-bar-panel", //show status bar
	    	                 "yb-viewSidebarMenuItem" //show sidebar menu
	    	               ];
	    	               
	    	function showElem(element) {	    		
	    		var elem = document.getElementById(element);
	    		if(elem) {	    			
	    			elem.hidden = false;
	    		}
	    	}	    	              
	    	showList.forEach(showElem);
	    }
		
		try {
			statusBar.init();
		
			statusBar.getUpdatedPrefs();
		
			statusBar.loadIcons();
			statusBar.reloadNetwork();
			
			statusBar.handleNetwork();
		} catch (e) {
				yDebug.print("ybookmarkStatusOverlay.js::loadStatusBar()=>Exception: "+e,YB_LOG_MESSAGE);
		}	
	},

	statusBarCleanup : function () {
		try {
			statusBar.unregister();
			statusBar.clearNetworkTimer();
		} catch (e) {
			yDebug.print("ybookmarkStatusOverlay.js::statusBar::cleanup()=>Exception: "+e,YB_LOG_MESSAGE);
		}
	}	
};

function deleteStatusbarHeap() 
{
	statusBar.statusBarCleanup();
    statusBar = null;
} 

//statusBar.
window.addEventListener("load", statusBar.loadStatusBar, false);
window.addEventListener("unload", deleteStatusbarHeap, false);
