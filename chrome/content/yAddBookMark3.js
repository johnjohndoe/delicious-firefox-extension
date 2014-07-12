var ybAddBkShare = {
	tweet: function() {
		var twtag = document.getElementById('deltwittertag');
		var oAuth = ybookmarksUtils.isTwitterOAuthEnabled();
		if(oAuth) {
			twtag = document.getElementById('deltwittertagNew');
		}
		var sBox = document.getElementById("tb_yBookmarkSend");
		if(twtag.getAttribute('status') == "") {
			sBox.addTag(DEL_TAG_TWITTER);
			twtag.setAttribute('status', 'active');
		} else {
			sBox.removeTag(DEL_TAG_TWITTER);
			twtag.setAttribute('status', '');
		}
	},
	openNetwork: function() {
		ybookmarksUtils.openLinkToNewTab("http://beta.delicious.bz/network/");
	},
	openNetworkFAQ: function() {
		ybookmarksUtils.openLinkToNewTab("http://beta.delicious.bz/help/faq#network");
	},
	updateSendMessageCount: function() {
		try {
		   var messageInput = document.getElementById("tweetMessageText");		
		   var msgCount = document.getElementById("lbl_msgCount");
		   var charsRemaining = YB_ADDBKMK_SHAREMSG_MAXLEN - messageInput.textLength;
		   //var numString =	yAddBookMark.strings.getFormattedString("extensions.ybookmarks.edit_dialog.name.count", [ charsRemaining ]);
		   //msgCount.value = numString;
		   msgCount.value = charsRemaining;
		   if (charsRemaining < 0) {
			 msgCount.setAttribute("class", "overflowed")
		   } else {
			 msgCount.setAttribute("class", "")     
		   }
		 } catch (e) { 
		   yDebug.print("updateSendMessageCount(): " + e, YB_LOG_MESSAGE);
		 }
	},
	
    twitterCancelClicked: function() {
        //set the loggedin panel for twitter if auth is true.
        var storeService = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
									getService(Components.interfaces.nsIYDelLocalStore);
        var authStatus = storeService.getProviderAuthStatus('twitter');
        if(authStatus == "true") {
	        ybAddBkShare.setTwitterLoggedIn();
			document.getElementById("tweetpublic").checked = false;
        }
		document.getElementById("twittercredstatus").value = "";
    },
    
	//If isLastCharSpace == true, check for recipients is done only if the last character is space.
	checkForRecipients: function(isLastCharSpace) {
		try {
			//update tag suggestion status
			yAddBookMark.updateTagSuggestionsStatus();
			
			var tagField = document.getElementById('tb_ybTags');
			var txt = tagField.value;
			if(txt) {
				var sendBox = document.getElementById('tb_yBookmarkSend');
				var sendBoxAdd = new Array();
				var txtlen = txt.length;
				if((txtlen > 1)) {
					if(isLastCharSpace) {
						if(txt[txtlen-1] != ' ') {
							return;
						}
					} 
					var arr = txt.split(' ');
					var arrlen = arr.length;
					var tags ="";
					for(var i=0; i < arrlen; ++i) {
						var tag = arr[i];
						if((tag.length > 4) && tag.indexOf('for:') == 0) {
							//add to send
							sendBoxAdd.push(tag.substring(4))
						} else {
							if(tag != '') {
								tags += tag + " ";
							}
						}					
					}
					var sendLen = sendBoxAdd.length;
					//Set Recipients.
					for(var i=0; i < sendLen; ++i) {
						sendBox.addTag(sendBoxAdd[i], true);
					}
					//Set tags.
					if(sendLen) {
						tagField.value = tags;
						if(isLastCharSpace) {
							tagField.focus();
						}
					}
				}
			}	
		} catch(e) {
			yDebug.print("checkForRecipients(): " + e, YB_LOG_MESSAGE);
		}
	},
	
	enableTwitterOAuthpanel: function() {
		document.getElementById("twitterOAuth").collapsed = false;
		var sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
			          		getService(Components.interfaces.nsIYDelLocalStore);
		if(sqliteStore.getProviderAutoSendPublicStatus('twitter') == "true") {
			//document.getElementById("twitoauthreq").setAttribute("collapsed", "true");
			document.getElementById("tweetAllpublic").checked = true;
		}
		var authStatus = sqliteStore.getProviderAuthStatus('twitter');
		if(authStatus == "true") {
			document.getElementById("twitoauthreq").collapsed = true;
			document.getElementById("twitteroAuthAvailable").collapsed = false;
		}
	},
	
	showTwitterOAuthRequiredError: function() {
		setSendDeck();//Move to Send tab
		activateTab(document.getElementById("sendtotwittertab"));//Move to twitter tab
		ybAddBkShare.enableTwitterOAuthpanel();
		document.getElementById("twitoauthreq").setAttribute("collapsed", "false");
        document.getElementById("twitterAuthrequired").setAttribute("ybError", "true");
		document.getElementById("twitteroAuthAvailable").setAttribute("collapsed", "true");
		//document.getElementById("tweetAllpublic").checked = false;
	},
	
    setTwitterLoggedIn: function() {
		var oAuth = true;
		if(oAuth) {
			//Turn on new twitter panel
			document.getElementById("twitterOAuth").collapsed = false;
			document.getElementById("twitteroAuthAvailable").collapsed = false;
			document.getElementById("twitoauthreq").collapsed = true;
		}
    },
    selectProvider: function(provider) {
        if(provider == DEL_PROVIDER_TWITTER) {
            activateTab(document.getElementById("sendtotwittertab"));
        } else if(provider == DEL_PROVIDER_EMAIL) {
            activateTab(document.getElementById("sendtoemailtab"));
        } 
    },
    //Call this function on-click of the tab alone.
    setLastProvider: function(provider) {
        //Set the preference on click .
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                              getService(Components.interfaces.nsIPrefBranch);
        prefs.setCharPref( "extensions.ybookmarks@yahoo.addbookmark.lastSelectedProvider", provider );

    },
	
	removeTwitterFromSend: function() {
		var noShare = document.getElementById('cb_noShare');
		if(noShare && noShare.checked) {
			var sendBox = document.getElementById('tb_yBookmarkSend');
			sendBox.removeTag(DEL_TAG_TWITTER, true);	
		}
	},
	
	observedSubjects: ["ybookmark.ybTagLines.tagAdded", "ybookmark.ybTagLines.clearAll",
					   "ybookmark.ybTagLines.tagRemoved", "ybookmark.twitterAuth.Success"],
	
	addSendboxObserver: function() {
		var os = Components.classes["@mozilla.org/observer-service;1"]
							 .getService(Components.interfaces.nsIObserverService);
		for (var i = 0; i < this.observedSubjects.length; i++) {				           
			os.addObserver( this, this.observedSubjects[i], false );
		}
	},
	
	removeSendboxObserver: function() {
		var os = Components.classes["@mozilla.org/observer-service;1"]
							 .getService(Components.interfaces.nsIObserverService);
		for (var i = 0; i < this.observedSubjects.length; i++) {				           
			os.removeObserver( this, this.observedSubjects[i]);
		}
	},
	
	observe: function(subject, topic, data) {
		//yDebug.print("Got observe::::" + subject + ",topic:" + topic + ",data:" + data , YB_LOG_MESSAGE);
		var atTwitter = document.getElementById('deltwittertag');
		var oAuth = ybookmarksUtils.isTwitterOAuthEnabled();
		if(oAuth) {
			atTwitter = document.getElementById('deltwittertagNew');
		}
		if(topic == "ybookmark.ybTagLines.clearAll") {
			atTwitter.setAttribute("status", "");
		} else if (topic == "ybookmark.ybTagLines.tagAdded") {
			if(data == DEL_TAG_TWITTER) atTwitter.setAttribute("status", "active");
		} else if(topic == "ybookmark.ybTagLines.tagRemoved") {
			if(data == DEL_TAG_TWITTER) atTwitter.setAttribute("status", "");
		} else if(topic == "ybookmark.twitterAuth.Success") {
			document.getElementById("twitoauthreq").collapsed = true;
			document.getElementById("twitteroAuthAvailable").collapsed = false;
			if(data) {
				if(data == "twitter%3A1") {
					document.getElementById("tweetAllpublic").checked = true;
				} else {
					document.getElementById("tweetAllpublic").checked = false;
				}
			}
			window.focus();
		}
		ybAddBkShare.updateMessageField(topic);
	},
	
	updateMessageField: function(topic) {
		var sendBox = document.getElementById('tb_yBookmarkSend');
		if(topic == "ybookmark.ybTagLines.clearAll") {
			//hide message box
			ybAddBkShare.showMessageField(false);
		} else if (topic == "ybookmark.ybTagLines.tagAdded") {
			//show messagebox
			ybAddBkShare.showMessageField(true);
		} else if(topic == "ybookmark.ybTagLines.tagRemoved") {
			//check sendbox n decide
			ybAddBkShare.showMessageField( sendBox.extendedValue ? true : false );
		}
	},
	
	showMessageField: function(show) {
		var msgElems = ["tweetMessage", "lbl_msgCountBox", "lbl_tweetDesc"];
		var tMsg = document.getElementById("tweetMessage");
		if(show && tMsg.collapsed) {
			for each(var elem in msgElems) {
				document.getElementById(elem).collapsed = false;
			}
			window.sizeToContent();
		} else if(!show && !tMsg.collapsed) {
			for each(var elem in msgElems) {
				document.getElementById(elem).collapsed = true;
			}
			window.sizeToContent();
		}
	},
	
	onSendTabClick: function(elem, provider) {
		activateTab(elem);
		ybAddBkShare.setLastProvider(provider);
	}
}

//Set delicious/twitter/Email
function setDeck(deck, index)
{
	document.getElementById(deck).setAttribute("selectedIndex",index);
}


//Tags
function setTagsDeck()
{
	//document.getElementById("myTopDeck").setAttribute("selectedIndex",0);
	var elem = document.getElementById("toptagtab");
	activateTopTab(elem);
}

//Send
function setSendDeck()
{
	//document.getElementById("myTopDeck").setAttribute("selectedIndex",1);
	var elem = document.getElementById("topsendtab");
	activateTopTab(elem);
}


//Activate one of the send tabs.
function activateTab(elem) {
	var tabIds =  new Array("sendtodelicioustab", "sendtotwittertab", "sendtoemailtab");
	for each (var item in tabIds) {
		document.getElementById(item).setAttribute("status", "");
	}
	elem.setAttribute("status", "active");
	setDeck("myDeck", elem.getAttribute("delindex"));
}

//Activate one of the top tabs.
function activateTopTab(elem) {
	var tabIds =  new Array("toptagtab", "topsendtab");
	for each (var item in tabIds) {
		document.getElementById(item).setAttribute("status", "");
	}
	elem.setAttribute("status", "active");	
	setDeck("myTopDeck", elem.getAttribute("delindex"));
	//document.getElementById("myTopDeck").setAttribute("selectedIndex", elem.getAttribute("delindex"));
}

