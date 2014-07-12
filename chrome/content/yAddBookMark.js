const YB_ADDBOOKMARK_NOTES_MAX_LENGTH = 1000;
const YB_ADDBOOKMARK_TITLE_MAX_LENGTH = 255;
const YB_ADDBKMK_SHAREMSG_MAXLEN = 116;
const YB_ADDBOOKMARK_WINDOW_MIN_WIDTH = 650;
const YB_ADDBOOKMARK_WINDOW_MIN_HEIGHT = 550;


var yAddBookMark = {
   post: {
      title: '',
      url: '',
      tags: null,
      systemTags: null,
      forTags: null,
      notes: '',
      shared: "true",
      rss: false,
      shortcut: "",
      postData: "",
      added_date: null
   },
   config: {
      maxSuggestedTags: 8,
      midColMaxChars: null,
      inputTagBoxID: 'tb_ybTags',
      traditionalAddPref: 2,
      rssTag: 'firefox:rss',
      emptyTag: 'system:unfiled',
      dialogID: 'dlg_AddYBookMark',
      specialTagPref: 'system:',
      shortcutTagPref: 'shortcut:',
      forTagPref: 'for:',		
      attr_selected: "yb_selected",
      attr_related: "yb_related",
      sgstTagPrefix: "lbl_sgstTag_",
      class_mousedOver: "moused-over-tag",
      class_mousedOut: "moused-out-tag",
      bmLetURLPref: "javascript:"
   },
   inputTagBox: null,
   editOp: false,
   blankEntry: false,
   keywordInput: false,
   existingEntry: null,
   kDelContractID: "@yahoo.com/socialstore/delicious;1",
   kSyncServiceContractID: "@mozilla.org/ybookmarks-sync-service;1",
   nSgstTagInserts: 0,
   nameInputElt: null,
   yAddWindow: null,

   sqliteStore: null,
   syncService: null,

   _bookmarkID: null,
   _microsummaries: null,
   __mss: null,
   originalGetShortcutOrURI: null,

   get _mss() {
     if (!this.__mss) {
       this.__mss = Components.classes["@mozilla.org/microsummary/service;1"];
       if (this.__mss) {
         this.__mss = this.__mss.getService( Components.interfaces.nsIMicrosummaryService );
       }
     }
     return this.__mss;
   },


   __ios: null,
   get _ios() {
     if (!this.__ios)
       this.__ios = Components.classes["@mozilla.org/network/io-service;1"].
                   getService(Components.interfaces.nsIIOService);
       return this.__ios;
   },

   _prefs: null,
   get prefs() {
      if( this._prefs == null ) {
         this._prefs = Components.classes["@mozilla.org/preferences-service;1"].
                              getService(Components.interfaces.nsIPrefBranch);
      }
      return this._prefs;
   },   
 
   open: function( url, title, charset, isWebPanel, notes, feedUrl, blankEntry, postData, keywordInput, userSelectedTag ) {
      // check if user is logged in
      if( !YBidManager.isUserLoggedIn() && (ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_STANDARD)) {                  
         YBidManager.promptUserLogin(true);
         return;
      }

      if( url == null ) {
         url = '';
      }
      if( title == null ) {
         title = '';
      }
      if( blankEntry == null ) {
         blankEntry = false;
      }
      if( keywordInput == null ) {
         keywordInput = false;
      }

      this.post.url = url;
      this.post.title = title;
      this.post.notes = (notes?notes:'');
      this.post.charset = (charset?charset:"");
      this.post.isWebPanel = (isWebPanel?isWebPanel:false);
      this.post.tags = new Array();
      this.post.shortcut = "";
      this.post.systemTags = null;
      this.post.forTags = null;

      if( postData != null ) {
         this.post.postData = postData;
      }
      else {
         this.post.postData = "";
      }

      if (feedUrl) {
        this.post.url = feedUrl;
        this.post.rss = true;
      } else {
        this.post.rss = false;
      }

      if( ( this.post.url.length == 0 ) && ( blankEntry != true ) ) {
         this._getDoc( window );
      }

      var defaultSharing = 0;
      try {
        defaultSharing = this.prefs.getIntPref( "extensions.ybookmarks@yahoo.sharemode" );
        // 1 - private  2 - public
        defaultSharing = ( defaultSharing == 1 ? "false" : "true" );
      } catch ( e ) {
        defaultSharing = "true";
      }

      this.post.shared = defaultSharing;

      if( blankEntry != true ) {
         this._checkForEditOperation();
      } else {
         this.editOp = false;
      }
      //handle classic mode
      if( (this._checkAddMechPref() == this.config.traditionalAddPref) || (ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)) {
         this._traditionalAdd();
      }
      else {
         var rv = { openTraditionalAdd: false };
         if(!this.yAddWindow || this.yAddWindow.closed) {
            this.yAddWindow = window.openDialog( "chrome://ybookmarks/content/yAddBookMark.xul",
                               "AddBookMarks",
                               "chrome,centerscreen,resizable", 
                               this.post, this.editOp, blankEntry, keywordInput, rv, userSelectedTag );
         }
         this.yAddWindow.focus();
      }
   },

   _getLocalStore: function() {
      if( this.sqliteStore == null ) {
         try {
            this.sqliteStore = Components.classes["@yahoo.com/nsYDelLocalStore;1"].
				          getService(Components.interfaces.nsIYDelLocalStore);                      
         }
         catch( e ) {
            yDebug.print( "couldn't get ystore!", YB_LOG_MESSAGE );
            return;
         }
      }
   },

   _getSyncService: function() {
      if( this.syncService == null ) {
         try {
            this.syncService = ( Components.classes[this.kSyncServiceContractID].
                                 getService(Components.interfaces.nsIYBookmarkSyncService) );
         }
         catch( e ) {
            yDebug.print( "couldn't get syncService!", YB_LOG_MESSAGE );
            return;
         }
      }
   },

   _checkForEditOperation: function() {
      this._getLocalStore();      
      
      //check for browse bar url
      var bUrl = deliciousService.getBrowseBarUrl();
      var aHash = null;
      var existingBkmk = false;
      
      if(this.post &&
      this.post.url &&
      this.post.url.indexOf(bUrl) == 0) {
      	var url = this.post.url;
      	
      	if(url.indexOf('#') != -1 &&
      	url.lastIndexOf('#') != -1 &&
      	url.lastIndexOf('#') < url.length) {
      		aHash = url.substr(url.lastIndexOf('#')+4);
      	}
      }

      if(aHash) {
      	existingBkmk = (this.sqliteStore.getBookmarkForHash( aHash ) != null);
      } else {
      	existingBkmk = this.sqliteStore.isBookmarked( this.post.url );
      }
   

      if(!existingBkmk) {
         this.editOp = false;
      }
      else {
         // check if the bookmark is a child of livemark. Bookmark object within Livemark is not
         // eligible for edit operations.
         yDebug.print ( "Existing entry for " + this.post.url );   
           this.editOp = true;           
	       //test-sqlite

	       if(aHash) {
	       	this.existingEntry = this.sqliteStore.getBookmarkForHash( aHash );
	       	this.post.url = this.existingEntry.url;
	       } else {
	       	this.existingEntry = this.sqliteStore.getBookmark( this.post.url );		   
	       }

	       /*
           // see if microsummary was used while editing. If keep the title same as 
           // that of the web page
           var microSummaries = null;
           if (this._mss ) {
             try { // 2007-01-11 cmyang: need this try/catch block because the mss barfs on non HTML/XML (i.e images, etc)
             microSummaries = this._mss.getMicrosummaries( this._ios.newURI ( this.post.url, null, null ),
                                                               this.sqliteStore.isBookmarked( this.post.url )
                                                             );
             } catch(e) {
               yDebug.print("Microsummary Service error with URL '" + this.post.url + "': " + e + " --> Ignoring Error");
             }
           }
           if ( !microSummaries || !microSummaries.Enumerate().hasMoreElements() ) {
             this.post.title = this.existingEntry.name;
           }
           */
           this.post.title = this.existingEntry.name;
           this.post.notes = this.existingEntry.description;
           this.post.shared = this.existingEntry.shared;
           this.post.localOnly = this.existingEntry.localOnly;           
           this.post.shortcut = this.existingEntry.shortcut;
           this.post.postData = this.existingEntry.postData;
           this.post.added_date = this.existingEntry.added_date;
           
           //todo: load shared attribute here

           yDebug.print( "name: " + this.existingEntry.name );
           yDebug.print( "url: " + this.existingEntry.url );
           yDebug.print( "description: " + this.existingEntry.description );
           yDebug.print( "Shared: " + this.existingEntry.shared );
           yDebug.print( "localOnly: " + this.existingEntry.localOnly );
           yDebug.print( "postData: " + this.existingEntry.postData );
           yDebug.print( "added_date: " + this.existingEntry.added_date );
           
           //Current implementation does not return tags as part on getBookmark(url) 
           /*
           var tag, tags = this.existingEntry.tags.enumerate();
           while( tags.hasMoreElements() ) {
              tag = 
                 ( tags.getNext().QueryInterface( Components.interfaces.nsISupportsString ) ).data;
              this.post.tags.push( tag );
           }
           */
           var tags = this.sqliteStore.getTags( this.post.url, {} );
           for( var i in tags) {
               this.post.tags.push( tags[i] );
           }
      }
   },
   
   urlClick: function() {
        var txtbx = document.getElementById( 'tb_yBookmarkURL' );
        var lbl = document.getElementById( 'lbl_yBookmarkURL' );
        lbl.hidden = true;
        txtbx.hidden = false;
        txtbox.focus();
    },
    
    getSelectedText: function() {
      var wm = Components.classes[ "@mozilla.org/appshell/window-mediator;1" ]
                               .getService( Components.interfaces.nsIWindowMediator );
         var browserWin = wm.getMostRecentWindow( "navigator:browser" );
         var selObj = browserWin.content.getSelection();
         if( selObj ) {
            var str = selObj.toString();
            if( str && str.length > 0 ) {
               return str;
               ( document.getElementById( "tb_yBookmarkNotes" ) ).setAttribute( "value", str );
            }
         }
         return "";
    },

   init: function() {

      try {
         this.post = window.arguments[ 0 ];
         this.editOp = window.arguments[ 1 ];
         this.blankEntry = window.arguments[ 2 ];
         this.keywordInput = window.arguments[ 3 ];
         this.userSelectedTag = window.arguments[ 5 ];
      } catch( e ) { }

      var elt;

      var txtbx = document.getElementById( 'tb_yBookmarkURL' );
      var lbl = document.getElementById( 'lbl_yBookmarkURL' );
      var btn_delete = document.getElementById( 'btn_delete' );
      
      this.strings = document.getElementById("ybookmarks-strings");
      this.config.midColMaxChars = 
         ( document.getElementById( "tb_yBookmarkURL" ) ).getAttribute( "cols" );
      
      if( this.post.url.length > ( this.config.midColMaxChars - 3 ) ) {
         lbl.value = this.post.url.substr( 0, this.config.midColMaxChars - 3 );
         lbl.value += "...";
      }
      else {
         lbl.value = this.post.url;
      }
      txtbx.value = this.post.url;

      if( this.editOp || ( this.blankEntry == true ) || ( this.keywordInput == true ) ) {
         document.getElementById( "rw_keywordInput" ).hidden = false;
      }
      else {
         ( document.getElementById( "tb_yBookmarkKeyword" ) ).setAttribute( "tabindex", "-1" );
      }
      
      if( this.editOp || ( this.blankEntry == true ) ) {
         lbl.hidden = true;
         txtbx.focus();
         btn_delete.hidden = false;
      }
      else {
         lbl.hidden = false;
         lbl.setAttribute( "class", this.config.class_mousedOut );
         lbl.setAttribute( "onclick", "yAddBookMark.urlClick();" );
         txtbx.hidden = true;
         txtbx.setAttribute( "tabindex", "-1" );
         ( document.getElementById( "tb_yBookmarkName" ) ).focus();
         btn_delete.hidden = true;
      }

      document.getElementById( 'tb_yBookmarkName' ).value = this.post.title;
      document.getElementById( 'menu_yBookmarkName' ).value = this.post.title;
      document.getElementById( "userEnteredNameItem").label = this.post.title;
      this.nameInputElt = 'tb_yBookmarkName';

      document.getElementById('tb_yBookmarkNotes').setAttribute("oninput", "yAddBookMark.updateNotesCount();");
      document.getElementById('tweetMessageText').setAttribute("oninput", "ybAddBkShare.updateSendMessageCount();");
      
      this.inputTagBox = document.getElementById( this.config.inputTagBoxID );
  
      /**
       * Hack to hide value column and add color
       
     this.inputTagBox.popup.treecols.firstChild.hidden = "true";
     this.inputTagBox.popup.tree.childNodes[1].style.color = "blue";
     */
     
      if( this.post.notes.length > 0 ) {
         elt = document.getElementById( 'tb_yBookmarkNotes' );
         elt.value = this.post.notes;
      }

      if ( this.post.tags ) {
         for( var i = 0; i < this.post.tags.length; ++i ) {
			var curTag = this.post.tags[ i ];
            // hide the implicit tags
            if( !this._isSystemTag( curTag ) ) {
				if(this.editOp) { //Don't show for:tags in edit dialog.
					if(!this.post.forTags) {
						this.post.forTags = new Array();
					}
					if(this._isForTag( curTag )) {
						this.post.forTags.push( curTag );
						continue;
					}
				}	
               yDebug.print( "going to add " + curTag );
               this._addToUserTags( curTag );
            } 
            else { 
                  if( !this.post.systemTags ) {
                     this.post.systemTags = new Array();
                  }
                  this.post.systemTags.push( curTag );
            }
         }
      }
      
      if(this.userSelectedTag && (this.post.tags.indexOf(this.userSelectedTag) == -1)) {
      	this._addToUserTags( this.userSelectedTag );
      }
      
      if( this.editOp == true ) {
         document.title = 
            document.getElementById( this.config.dialogID ).getAttribute( "editTitle" );
         document.getElementById('img_dlgTitle').setAttribute( "src", "chrome://ybookmarks/skin/deliciousEditBookmark.gif" );
      }
      else {
         document.title = 
            document.getElementById( this.config.dialogID ).getAttribute( "addTitle" );
         document.getElementById('img_dlgTitle').setAttribute( "src", "chrome://ybookmarks/skin/deliciousSaveaBookmark.gif" );            
      }

      var noShareCheckbox = document.getElementById( "cb_noShare" );
      if (this.post.shared && this.post.shared == "false") {
        noShareCheckbox.checked = true;
      }   
      
      var showLocalOnlyOption;
      try {
        showLocalOnlyOption = this.prefs.getBoolPref("extensions.ybookmarks@yahoo.show.localonly.option");
      } catch(e) {
        showLocalOnlyOption = false;
      }
        
      if (showLocalOnlyOption) {
        var localOnlyCheckbox = document.getElementById("cb_localOnly");
        localOnlyCheckbox.hidden = false;
        if (this.post.localOnly && this.post.localOnly == "true") {
          localOnlyCheckbox.checked = true;
          noShareCheckbox.checked = true;
          noShareCheckbox.disabled = true;
        }
      }
        
      document.getElementById( "tb_yBookmarkKeyword" ).value = this.post.shortcut;

      if( this.post.url.substr( 0, this.config.bmLetURLPref.length ) ==  this.config.bmLetURLPref ) {
        noShareCheckbox.checked = true;
        noShareCheckbox.disabled = true;
      }
      else if( this.post.url != '' ) {
         try {
           this._getLocalStore();
           if(this.sqliteStore.getProviderAuthStatus('twitter') == "true") {
               //Set the pref.TODO:Replace this with a new function in ssrDelicious.
               this.prefs.setBoolPref("extensions.ybookmarks@yahoo.delicious.twitter.auth.available", true);
           }  else {
               this.prefs.setBoolPref("extensions.ybookmarks@yahoo.delicious.twitter.auth.available", false);
           }
         } catch(e) {}
         this._querySuggestedTags();
      }
      
      var lbl_origPostInfo = document.getElementById( "lbl_origPostInfo" );
      if( this.editOp == true ) {
          var added_date = new Date(this.post.added_date / 1000);
          yDebug.print("*** added_date = " + added_date);
		  lbl_origPostInfo.value = 
			this.strings.getFormattedString("extensions.ybookmarks.edit_dialog.originally_saved_on", 
                                            [
                                             added_date.getDate(),
                                             this.getStringForMonth(added_date.getMonth()),
                                             added_date.getFullYear()
                                             ]);
          lbl_origPostInfo.hidden = false;
      } else {
          lbl_origPostInfo.hidden = true;
      }

      try {
         //this._initMicrosummary();
      }
      catch( e ) {
         yDebug.print( "exception while executing  _initMicrosummary: " + e, YB_LOG_MESSAGE );
      }

      this._resetSaveButton();

      document.getElementById( "lbl_userName" ).setAttribute( 
         "value", deliciousService.getUserName() );

      if( this.post.notes.length == 0 ) {
         var selText = this.getSelectedText();
         if(selText && selText.length) {
            document.getElementById( "tb_yBookmarkNotes" ).setAttribute( "value",  selText);
         }
      }

      /*
      elt = document.getElementById( "lbl_popTagsHelp" );
      elt.setAttribute( "value", elt.getAttribute( "value" ) + deliciousService.getServiceName() );
      */
      this.updateNotesCount();
      //Set focus on the tags field.
      ( document.getElementById( "tb_ybTags" ) ).focus();
	  //Set Network/Email data
	  this.setShareData();
      window.addEventListener("click", ybUpdateSendList, false);
   },
   
   uninit : function() {
      window.removeEventListener("click", ybUpdateSendList, false);
	  ybAddBkShare.removeSendboxObserver();	
   },

   getStringForMonth: function(num) {
		var months = this.strings.getString("extensions.ybookmarks.edit_dialog.originally_saved_months");
		return months.split(' ')[num];
   },
   
   setShareData: function() {
	  try {
		this._getLocalStore();
		//add observers
		ybAddBkShare.addSendboxObserver();
		//Fill email lists.
		var test_data = this.sqliteStore.getRecipients(DEL_PROVIDER_EMAIL, "frequency", {});							
		document.getElementById("emailsharelist").setData(test_data);
		
		//delicious network dummy data
		var test_net = this.sqliteStore.getRecipients(DEL_PROVIDER_DELICIOUS, "alpha", {});							
		document.getElementById("del_network_list").setData(test_net);
		//Set data for network last.
		var test_net_last = this.sqliteStore.getRecipients(DEL_PROVIDER_DELICIOUS, "frequency", {});
		document.getElementById("del_network_list_last").setData(test_net_last);
		//Show the info on Network if n/w is empty 
		if(test_net.length == 0) {
			document.getElementById('delnetworklists').collapsed = true;
			document.getElementById('delemptynetwork').collapsed = false;
		}
                
        var oAuth = ybookmarksUtils.isTwitterOAuthEnabled();
        if(oAuth) {
            ybAddBkShare.enableTwitterOAuthpanel();
        } else {
            //set the loggedin panel for twitter if auth is true.
            var authStatus = this.sqliteStore.getProviderAuthStatus('twitter');
            if(authStatus == "true") {
                    ybAddBkShare.setTwitterLoggedIn();            
            }
        }
         //Get tweet all public state  
         this.tweetAllpublicState = this.sqliteStore.getProviderAutoSendPublicStatus('twitter');
         if(!this.editOp && ( this.tweetAllpublicState == "true")) {
                  ybAddBkShare.tweet();
                  ( document.getElementById( "tb_ybTags" ) ).focus();
         }
        //set provider
        var lastSelectedProvider = this.prefs.getCharPref( "extensions.ybookmarks@yahoo.addbookmark.lastSelectedProvider" );
        if(lastSelectedProvider) {
            //set the provider
            ybAddBkShare.selectProvider(lastSelectedProvider);
        } else {
            if(authStatus) {
                activateTab(document.getElementById("sendtodelicioustab"));
            } else {
                activateTab(document.getElementById("sendtotwittertab"));
            }
        }
	  } catch(e) {
		yDebug.print("Exception in yAddBookmark.js::setShareData():" + e, YB_LOG_MESSAGE);
	  }
 
   },
   
   _isSystemTag: function( tag ) {
      if( tag.substr( 0, this.config.specialTagPref.length ) == this.config.specialTagPref ) {
         return true;
      }
      if( tag.substr( 0, this.config.shortcutTagPref.length ) == this.config.shortcutTagPref ) {
         return true;
      }
      if( tag == this.config.rssTag ) {
         return true;
      }
      return false;
   },
   //returns true if tag begins with for:* 
   _isForTag: function(tag) {
	  if(tag && (tag.length > 4) && (tag.indexOf(this.config.forTagPref) == 0) ) {
		return true;
	  }
	  return false;	
   },

   _initMicrosummary: function() {
     if (!this._mss) {
       yDebug.print ( "Microsummary is not available in this version of firefox. Please upgrade to Firefox 2.x" );
       document.getElementById( "menu_yBookmarkName" ).setAttribute( "droppable", "false" );
       return;
     }

     if ( this.post.url.length <= 0 ) {
        yDebug.print ( "Nothing to bookmark here" );
        document.getElementById( "menu_yBookmarkName" ).setAttribute( "droppable", "false" );
        return;
     }

     this._getLocalStore();
     this._bookmarkID = this.sqliteStore.isBookmarked( this.post.url );
     var uri = this._ios.newURI ( this.post.url, null, null );
     this._microsummaries = this._mss.getMicrosummaries( uri,
                                                         this._bookmarkID
                                                       );
     this._observer._self = this;
     this._microsummaries.addObserver(this._observer);
     this.updateMicrosummary();
   },

   _observer: {

      interfaces: [ Components.interfaces.nsIMicorsummaryObserver, Components.interfaces.nsISupports ],

      onContentLoaded: function(microsummary) {
        this._self.updateMicrosummary();
      },

      onElementAppended: function(microsummary) {
        this._self.updateMicrosummary();
      }
   },

   onInput: function( elt ) {
      if( elt.id == "menu_yBookmarkName" ) {
         var nameField = document.getElementById( "menu_yBookmarkName" );
         var nameItem = document.getElementById( "userEnteredNameItem" );
         nameItem.label = nameField.value;
      }
      this._resetSaveButton();
      // check if bookmarklet is being changed
      if( ( this.editOp ) && ( elt.id == "tb_yBookmarkURL" ) ) {
         var urlField = document.getElementById( "tb_yBookmarkURL" );
         var cb = document.getElementById( "cb_noShare" );
         if( urlField.value.substr( 0, this.config.bmLetURLPref.length ) == this.config.bmLetURLPref ) {
            cb.checked = true;
            cb.disabled = true;
         }
         else {
            cb.disabled = false;
         }
      }
   },
   
   updateNotesCount:function() {
     try {
       
       var notesInput = document.getElementById("tb_yBookmarkNotes");
       /*if (notesInput.textLength > YB_ADDBOOKMARK_NOTES_MAX_LENGTH) {
         notesInput.value = notesInput.value.substring(0, YB_ADDBOOKMARK_NOTES_MAX_LENGTH);
       }*/
    
       var notesCount = document.getElementById("lbl_notesCount");
       var charsRemaining = YB_ADDBOOKMARK_NOTES_MAX_LENGTH - notesInput.textLength;
       /*var numString = yAddBookMark.strings.getFormattedString("extensions.ybookmarks.edit_dialog.name.count", 
                                                        [ charsRemaining ]);
       notesCount.value = numString;
       */
       notesCount.value = charsRemaining;
       if (charsRemaining < 0) {
         notesCount.setAttribute("class", "overflowed")
       } else {
         notesCount.setAttribute("class", "")     
       }
     } catch (e) { 
       yDebug.print("updateNotesCount(): " + e);
     }
   },
/*
   restrictTags: function() {
      try {
         var tags = this.inputTagBox.value.split(' ');
         if(tags.length >= 50) {
            var newTags =  "";
            for(var i=0; i<50; ++i) {
               newTags += " " + tags[i];
            }
            this.inputTagBox.value = newTags;
         }
      } catch(e) {
         alert(e);
      }
   },
*/   
   onSelectLocalOnlyOption : function(event) {
     
     var noShareCheckbox = document.getElementById( "cb_noShare" );
     if (event.target.checked) {
       noShareCheckbox.checked = true;
       noShareCheckbox.disabled = true;
     }
     else {
       if ( this.post.url.substr( 0, this.config.bmLetURLPref.length ) ==  this.config.bmLetURLPref ) {
         noShareCheckbox.checked = true;
         noShareCheckbox.disabled = true;
       }
       else {
         noShareCheckbox.disabled = false;
       }  
     }
   },

   _resetSaveButton: function() {
      var okButton = document.getElementById( "btn_save" );
      var nameField = document.getElementById( this.nameInputElt );
      var urlField = document.getElementById( "tb_yBookmarkURL" );
      okButton.disabled = 
         ( nameField.value.length == 0 || urlField.value.length == 0 ) ? true : false;
   },
         
   updateMicrosummary: function() {
     if (!this._microsummaries)
       return;

     var summaryList = document.getElementById( "menu_yBookmarkName" );
     var microsummaryPopup = document.getElementById( "microsummaryMenuPopup" );

     while ( microsummaryPopup.childNodes.length > 2 ) {
        microsummaryPopup.removeChild ( microsummaryPopup.lastChild );
     }

     var enumerator = this._microsummaries.Enumerate();
     if ( enumerator.hasMoreElements() ) {
        summaryList.setAttribute( "droppable", "true" ); 
     } else {
        summaryList.setAttribute( "droppable", "false" ); 
     }

     var activeMicrosummary = null;
     if ( summaryList.menuBoxObject.activeChild ) {
       activeMicrosummary = summaryList.menuBoxObject.activeChild.microsummary;
     }

     var nInserts = 0;
     while ( enumerator.hasMoreElements() ) {
       var microsummary = enumerator.getNext().QueryInterface ( Components.interfaces.nsIMicrosummary );
       if ( microsummary.content ) {
         var menuitem = document.createElement ( "menuitem" );
         menuitem.setAttribute( "label", microsummary.content );
         // for commit use
         menuitem.microsummary = microsummary;
         microsummaryPopup.appendChild ( menuitem );
         ++nInserts;

         // select the menu item, if this microsummary is the one used while bookmarking earlier
         if ( this._bookmarkID && this._mss.isMicrosummary( this._bookmarkID, microsummary ) ) {
           summaryList.selectedItem = menuitem;
         }

         if ( activeMicrosummary && microsummary == activeMicrosummary ) {
           summaryList.menuBoxObject.activeChild = menuitem;
         }
       } else {
         microsummary.update();
       }
     }
     if( ( nInserts > 0 ) && ( this.nameInputElt == "tb_yBookmarkName" ) ) {
       // hide the simple text box and show the menupopup
       var elt = document.getElementById( "tb_yBookmarkName" );
       elt.hidden = true;
       elt.setAttribute( "tabindex", "-1" );
       elt = document.getElementById( "menu_yBookmarkName" );
       elt.hidden = false;
       this.nameInputElt = "menu_yBookmarkName";
       document.getElementById("lbl_nameCount").hidden = true;
       //sizeToContent();
       if( !this.editOp ) {                 // URL textbox retains focus in edit dialog
         elt.focus();
       }
     }
   },

   _getDoc: function( currWindow ) {
      var browser = currWindow.getBrowser();
      var webNav = browser.webNavigation;
      if( webNav.currentURI ) {
         this.post.url = webNav.currentURI.spec;
      }
      if( webNav.document.title ) {
         this.post.title = webNav.document.title;
      }
      else {
         this.post.title = this.post.url;
      }
   },

   _setSuggestions: function( tags, containerName, maxTags ) {
      if( maxTags == null ) {
         maxTags = tags.length;      // use all available input tags
      }
      if( tags.length > 0 ) {
         var nElts = ( tags.length < maxTags ) ?  tags.length : maxTags;
         var i, elt;
         var container = document.getElementById( containerName );
         var currBox = null, tag;
         var rowStrLen = 0, nInserts = 0;
         for( i = 0; ( nInserts < nElts ) && ( i < tags.length ); ++i ) {
            tag = ( tags.queryElementAt( i, Components.interfaces.nsISupportsString ) ).data;
            if( !this._isSystemTag( tag ) ) {
               if( ( currBox == null ) || ( rowStrLen >= ( this.config.midColMaxChars - 15 ) ) ) {
                  if( currBox != null ) {
                     container.appendChild( currBox );
                  }
                  currBox = document.createElement( "hbox" );
                  rowStrLen = 0;
               }
               elt = this._createTagLabel( tag );
               currBox.appendChild( elt );
               ++nInserts;
               rowStrLen += tag.length;
            }
         }
         if( currBox != null ) {
            container.appendChild( currBox );
            container.hidden = false;
            //sizeToContent();
         }
      }
   },

   _createTagLabel: function( tag ) {
      var i, elt, newElt = document.createElement( "label" );
      var newEltId = this.config.sgstTagPrefix + this.nSgstTagInserts;
      newElt.setAttribute( "id", newEltId );
      newElt.setAttribute( "value", tag );
      newElt.setAttribute( "class", this.config.class_mousedOut );
      newElt.setAttribute( this.config.attr_selected, "false" );
      newElt.setAttribute( "onclick", "yAddBookMark.tagClick( this );" );
      newElt.setAttribute( "tabindex", "-1" );
      newElt.addEventListener( "mouseover", yAddBookMark.tagMouseOver, false );
      newElt.addEventListener( "mouseout", yAddBookMark.tagMouseOut, false );
      if( this.editOp ) {
         for( i = 0; i < this.post.tags.length; ++i ) {
            if( tag == this.post.tags[ i ] ) {
               newElt.setAttribute( "class", this.config.class_mousedOver );
               newElt.setAttribute( this.config.attr_selected, "true" );
               break;
            }
         }
      }
      ++this.nSgstTagInserts;
      return newElt;
   },
   
   _createRelations: function() {
      var i, j, hash = {}, elt, tag;
      for( i = 0; i < this.nSgstTagInserts; ++i ) {
         elt = document.getElementById( this.config.sgstTagPrefix + i );
         tag = elt.getAttribute( "value" );
         if( !hash[ tag ] ) {
            hash[ tag ] = new Array();
         }
         hash[ tag ].push( elt );
      }
      for( tag in hash ) {
         if( hash[ tag ].length > 1 ) {
            for( i = 0; i < hash[ tag ].length; ++i ) {
               for( j = 0; j < hash[ tag ].length; ++j ) {
                  if( i != j ) {
                     this._addRelative( hash[ tag ][ i ], hash[ tag ][ j ] );
                  }
               }
            }
         }
         hash[ tag ] = null;
      }
   },

   _addRelative: function( obj, relative ) {
      var links = obj.getAttribute( this.config.attr_related );
      if( links.length == 0 ) {
         links = relative.getAttribute( "id" );
      }
      else {
         links = links + ',' + relative.getAttribute( "id" );
      }
      obj.setAttribute( this.config.attr_related, links );
   },
   
   //Highlights tags in popular/recommended as user types in tags field. 
   updateTagSuggestionsStatus: function() {
      var tagsString = this.inputTagBox.value.toLowerCase();
      if(tagsString) {
         var tagsList = tagsString.split(' ');
         const suggestLists = ["hbx_recTags", "hbx_popTags"];
         for(var j = 0; j < suggestLists.length; ++j) {
            var tagNodes = document.getElementById(suggestLists[j]).getElementsByTagName("label");
            //First two labels are not tags, skip them
            for(var i = 2, len = tagNodes.length; i < len; ++i) {
               var tNode =  tagNodes[i];
               tNode.setAttribute( "class", this.config.class_mousedOut );
               tNode.setAttribute( this.config.attr_selected, "false" );
               if(tagsList.indexOf(tNode.value.toLowerCase()) != -1) {
                  tNode.setAttribute( "class", this.config.class_mousedOver );
                  tNode.setAttribute( this.config.attr_selected, "true" );
               }
            }
         }  
      }
   },
   
   tagClick: function( link ) {
      var idx = ybookmarksUtils.containsTag( this.inputTagBox.value, link.value );
      if( idx == -1 ) {
         this._addToUserTags( link.value );
         this._setTagAttribs( link, this.config.class_mousedOver, "true" );
      }
      else {
         this._removeTag( link.value, idx );
         this._setTagAttribs( link, this.config.class_mousedOut, "false" );
      }
      ( document.getElementById( "tb_ybTags" ) ).focus();
   },

   _setTagAttribs: function( elt, classVal, selectVal ) {
      elt.setAttribute( "class", classVal );
      elt.setAttribute( this.config.attr_selected, selectVal );
      var relationsStr = elt.getAttribute( this.config.attr_related );
      if( relationsStr.length > 0 ) {
         var relations = relationsStr.split( "," );
         var i, relatedElt;
         for( i = 0; i < relations.length; ++i ) {
            relatedElt = document.getElementById( relations[ i ] );
            relatedElt.setAttribute( "class", classVal );
            relatedElt.setAttribute( this.config.attr_selected, selectVal );
         }
      }
   },

   tagMouseOver: function( event ) {
      if( ( event.target.getAttribute( yAddBookMark.config.attr_selected ) == "false" ) && 
         ( event.target.getAttribute( "class" ) != yAddBookMark.config.class_mousedOver ) ) {
            event.target.setAttribute( "class", yAddBookMark.config.class_mousedOver );
      }
   },

   tagMouseOut: function( event ) {
      if( ( event.target.getAttribute( yAddBookMark.config.attr_selected ) == "false" ) &&
         ( event.target.getAttribute( "class" ) != yAddBookMark.config.class_mousedOut ) ) {
             event.target.setAttribute( "class", yAddBookMark.config.class_mousedOut );
      }
   },

   _querySuggestedTags: function() {
      var cb = {
         onload: function( dataArr ) {
            
         },
         onerror: function( event ) {
            yDebug.print("_querySuggestedTags::onError");
         }
      };

      var delStore;
      try {
         delStore = ( Components.classes[ this.kDelContractID ].
                      getService( Components.interfaces.nsISocialStore ) );
     delStore.getSuggestedTags( this.post.url, cb );
      }
      catch( e ) {
         yDebug.print( "exception: " + e, YB_LOG_MESSAGE );
      }
   },

   deleteBookMark: function() {
      var func = "yAddBookMark.js: deleteBookMark(): ";
      yDebug.print(func + "this.post.url = \"" + this.post.url + "\"");
      if( this.post.url.length > 0 ) { // Check that URL is valid before trying to delete
         this._getLocalStore();
         this._getSyncService();
         
         yDebug.print(func + "about to delete this.post.url = \"" + this.post.url + "\"");

         var promptService = 
             Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
             .getService(Components.interfaces.nsIPromptService);
         var isConfirmed = promptService.confirm(window,
                                                 "Delete bookmark?", 
                                                 "Are you sure you want to delete this bookmark?");
         if (!isConfirmed) {
             return false;
         }

		 this.sqliteStore.deleteBookmark( this.post.url );         
         this.sqliteStore.addTransaction("deleteBookmark", 0, "bookmark", YBJSON.stringify({url: this.post.url}));

         // Notify the sync service that we have a pending transaction to apply to del.icio.us
         var os = Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService);
         os.notifyObservers(null, "ybookmark.processTransactions", null);
         os.notifyObservers(null, "ybookmark.updateTagIcon", null);
      }

      this._removeObservers();
      window.close();
      return true;
   },

   _containsShortcut: function(aTags) {
     for (var i=0; i < aTags.length; i++) {
       var tag = aTags[i];
       var index = tag.indexOf(this.config.shortcutTagPref);
       if (index != -1) {
         index += this.config.shortcutTagPref.length;
         return tag.substr(index);
       }
     }
     return "";
   },
   
   _exciseShortcuts: function (aTags) {
      var result = [];
      for (var i=0; i < aTags.length; i++) {
         var tag = aTags[i];
         var index = tag.indexOf(this.config.shortcutTagPref);
         if (index != 0) {
           result.push(tag);
         }
       }

       return result;  
   },

   getShareMessage: function() {
	   var shareMsg = document.getElementById("tweetMessageText").value;
	   if(shareMsg)	{
	    if(shareMsg.length > YB_ADDBKMK_SHAREMSG_MAXLEN) {
			var truncateAutomatically = false;
	          try {
	            truncateAutomatically = this.prefs.getBoolPref("extensions.ybookmarks@yahoo.bookmark.shareMessage.truncate_automatically");
	          } catch (e) { }

	          if (!truncateAutomatically) {
	            var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
	                     getService(Components.interfaces.nsIPromptService);
	            var title = document.title;
	            var text = this.strings.getFormattedString("extensions.ybookmarks.edit_dialog.shareMessage.count.limit", 
	                                                       [YB_ADDBKMK_SHAREMSG_MAXLEN])
	            var truncate = this.strings.getString("extensions.ybookmarks.edit_dialog.shareMessage.count.limit.truncate");
	            var truncateCheck = { value: false };

	            promptService.alertCheck(this, title, text, truncate, truncateCheck);

	            if (truncateCheck.value) {
	              this.prefs.setBoolPref("extensions.ybookmarks@yahoo.bookmark.shareMessage.truncate_automatically", true);
	            } else {
	              document.getElementById("tweetMessageText").focus();
	              return false;
	            }
	          }
			  return shareMsg.substr(0, YB_ADDBKMK_SHAREMSG_MAXLEN);
		}
	   }
	   return shareMsg;	
   },

   getBkmkTitle: function() {
	try {
	   var title = document.getElementById(this.nameInputElt).value;
	   if(title)	{
	    if(title.length > YB_ADDBOOKMARK_TITLE_MAX_LENGTH) {
	          var truncateAutomatically = false;
	          try {
	            truncateAutomatically = this.prefs.getBoolPref("extensions.ybookmarks@yahoo.bookmark.title.truncate_automatically");
	          } catch (e) { }

	          if (!truncateAutomatically) {
	            var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
	                     getService(Components.interfaces.nsIPromptService);
	            var title = document.title;
	            var text = this.strings.getFormattedString("extensions.ybookmarks.edit_dialog.title.count.limit", 
	                                                       [YB_ADDBOOKMARK_TITLE_MAX_LENGTH])
	            var truncate = this.strings.getString("extensions.ybookmarks.edit_dialog.title.count.limit.truncate");
	            var truncateCheck = { value: false };

	            promptService.alertCheck(this, title, text, truncate, truncateCheck);

	            if (truncateCheck.value) {
	              this.prefs.setBoolPref("extensions.ybookmarks@yahoo.bookmark.title.truncate_automatically", true);
	            } else {
	              document.getElementById(this.nameInputElt).focus();
	              return false;
	            }
	          }
	          return title.substr(0, YB_ADDBOOKMARK_TITLE_MAX_LENGTH);
		}
	   }
	   return title;	
     } catch (e) {
       yDebug.print("yAddBookMark.getBkmkTitle: error with title count limit: " + e);
     }
   },
   
   saveBookMark: function() {
      try {
         var showErrorMsg = false;
         var result = this.saveBookMarkInternal();
         if(result === false) {
            showErrorMsg = true;
         }
      } catch(e) {
         yDebug.print("yAddBookMark.saveBookmark() Exception: " + e, YB_LOG_MESSAGE);
      } finally {
         if(showErrorMsg) {
            return;
         }
         var elt = document.getElementById( "tb_yBookmarkURL" );
         if(elt.value.length) {
            var corruptStore = false;
            try {
            corruptStore = Components.classes["@mozilla.org/preferences-service;1"].
					     getService(Components.interfaces.nsIPrefBranch).
                                             getBoolPref("extensions.ybookmarks@yahoo.extension.localstore.corrupt");
            } catch(e){}
            if(corruptStore) {
               var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
               var dialogTitleStr = this.strings.getString("extensions.ybookmarks.edit_dialog.sqlite.corruption.title");
               var dialogInfoStr = this.strings.getString("extensions.ybookmarks.edit_dialog.sqlite.corruption.message");
               var restartNow = this.strings.getString("extensions.ybookmarks.edit_dialog.sqlite.corruption.restartNow");
               var restartLater = this.strings.getString("extensions.ybookmarks.edit_dialog.sqlite.corruption.restartLater");
               // set the buttons that will appear on the dialog. It should be a set of constants multiplied by button position constants. In this case, 2 buttons appear.
               var flags = promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0 + promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1;
               var button_number = promptService.confirmEx(window, dialogTitleStr, dialogInfoStr,
                                       flags, restartNow, restartLater, null, null, {});
               if(button_number === 0) { //Restart Now
                  ybookmarksUtils._quit(true);
               }
            }
         }
         window.close();
      }
   },
   
   saveBookMarkInternal: function() {
     
      var notesInput = document.getElementById("tb_yBookmarkNotes");
      var notesCount = document.getElementById("lbl_notesCount");
      var charsRemaining = YB_ADDBOOKMARK_NOTES_MAX_LENGTH - notesInput.textLength;
      var notifySubject = "ybookmark.bookmarkAdded";
      
      if (charsRemaining < 0) {
        try {
          var truncateAutomatically = false;
          try {
            truncateAutomatically = this.prefs.getBoolPref("extensions.ybookmarks@yahoo.bookmark.notes.truncate_automatically");
          } catch (e) { }
           
          if (!truncateAutomatically) {
            var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
                     getService(Components.interfaces.nsIPromptService);
            var title = document.title;
            var text = this.strings.getFormattedString("extensions.ybookmarks.edit_dialog.notes.count.limit", 
                                                       [YB_ADDBOOKMARK_NOTES_MAX_LENGTH])
            var truncate = this.strings.getString("extensions.ybookmarks.edit_dialog.notes.count.limit.truncate");
            var truncateCheck = { value: false };
            
            promptService.alertCheck(this, title, text, truncate, truncateCheck);
            
            if (truncateCheck.value) {
              this.prefs.setBoolPref("extensions.ybookmarks@yahoo.bookmark.notes.truncate_automatically", true);
            } else {
              notesInput.focus();
              return false;
            }
          }
          
          notesInput.value = notesInput.value.substr(0, YB_ADDBOOKMARK_NOTES_MAX_LENGTH);
          
        } catch (e) {
          yDebug.print("yAddBookMark.saveBookMarkInternal: error with notes count limit: " + e);
        }
      } 
      
      if( this.blankEntry == true ) {
         this.post.url = ( document.getElementById( "tb_yBookmarkURL" ) ).value;
      }

      if( this.post.url.length > 0 ) {
         var elt;

         this._getLocalStore();
         this._getSyncService();
         var rv = window.arguments[ 4 ];
         var post;
         elt = document.getElementById("tb_yBookmarkSend");
         this.post.recipients = "";
         if(elt.extendedValue) {
         	this.post.recipients = elt.extendedValue;
         }
         yDebug.print ( "Recipients => " + this.post.recipients);
         
         var oAuth = ybookmarksUtils.isTwitterOAuthEnabled();
         if(oAuth && this.post.recipients) {
            var recArray = this.post.recipients.split(' ');
            if(recArray.indexOf("@twitter") != -1) {
               if(this.sqliteStore.getProviderAuthStatus('twitter') != "true") {
                  ybAddBkShare.showTwitterOAuthRequiredError();
                  return false;
               }
            }
         }

         var title = yAddBookMark.getBkmkTitle();
		 if(title === false) {
			return false;
		 }
		 this.post.title = title;
                 var shareMsg = yAddBookMark.getShareMessage();
		 if(shareMsg === false) {
			return false;
		 }
                 this.post.share_msg = shareMsg;
         if( this.editOp ) {
            elt = document.getElementById( "tb_yBookmarkURL" );
            if( this.post.url != elt.value ) {
               this.sqliteStore.deleteBookmark( this.post.url );
               this.sqliteStore.addTransaction("deleteBookmark", 0, "bookmark", YBJSON.stringify({url: this.post.url}));
               if( elt.value.length == 0 ) {  // user wants to delete the entry?
                  var os = Components.classes["@mozilla.org/observer-service;1"]
                         .getService(Components.interfaces.nsIObserverService);
                  os.notifyObservers(null, "ybookmark.processTransactions", null);
                  this._removeObservers();
                  return true;
               }
               this.post.url = elt.value;
               this.editOp = false;
            }
         }

         elt = document.getElementById( 'tb_yBookmarkURL' );
         this.post.url = elt.value;

         elt = document.getElementById( "tb_yBookmarkNotes" );
         if( elt.value.length > 0 ) {
            this.post.notes = elt.value;
         } else {
            this.post.notes = "";
         }

         elt = document.getElementById( "cb_noShare" );
         this.post.shared = (elt.checked?"false":"true");

         elt = document.getElementById( "cb_localOnly" );
         this.post.localOnly = (elt.checked? "true" : "false");         

         elt = document.getElementById( "tb_yBookmarkKeyword" );
         this.post.shortcut = elt.value;
   
         yDebug.print ( "IS POST AN RSS => " + this.post.rss );
         this._getPostTags();
         
         if (this.editOp) {
             this.post.tags = this._exciseShortcuts(this.post.tags);    
           } else {
             this.post.shortcut =  this.post.shortcut ? this.post.shortcut : this._containsShortcut(this.post.tags);             
             yDebug.print("shortcut found: " + this.post.shortcut);
         }
         
         if(this.post.tags) {
            if(this.post.tags.length > 50) {
               alert("50 tag limit reached, please concentrate tags.");
               return false;
            }
         }
         if( yDebug.on() ) {
            this._dumpPost();
         }
         
         post = this.post;
         post.wrappedJSObject = post; 
                 
         if( this.editOp ) {
            this.sqliteStore.editBookmark( this.post.url,  this._createBookmarkObject());
            this.sqliteStore.addTransaction("editBookmark", 0, "bookmark", this._createBookmarkTransactionObject());
            notifySubject = "ybookmark.bookmarkEdited";            
         }
         else {
            if ( this.post.rss ) {
              this.sqliteStore.addLivemark( this.post.url, this.post.title,
                                           this.post.notes,
                                           this.post.tags.length, this.post.tags, 
                                           this.post.shared,
                                           this.post.localOnly);
            } else {
			  this.sqliteStore.addBookmark( this.post.url, this.post.title,
                                              this.post.notes, 
                                              this.post.shortcut,
                                              this.post.postData,
                                              this.post.tags.length, this.post.tags, 
                                              this.post.shared,
                                              this.post.localOnly);
            }
            this.sqliteStore.addTransaction("addBookmark", 0, "bookmark", this._createBookmarkTransactionObject());
        }
        //Update tweet all public status change
        var os = Components.classes["@mozilla.org/observer-service;1"]
                   .getService(Components.interfaces.nsIObserverService);
        //this._updateMicrosummary(); 
        os.notifyObservers(null, "ybookmark.processTransactions", null);
        os.notifyObservers(null, "ybookmark.updateTagIcon", null);
        os.notifyObservers(null, notifySubject, null);
      }
      this._removeObservers();
   },

   _updateMicrosummary: function() {
        // update micro summary too
        var nameElement = document.getElementById( "menu_yBookmarkName" );
        var microsummary = null;
        if ( nameElement.selectedItem ) {
          microsummary = nameElement.selectedItem.microsummary;
        }
        //this.post.microsummary = null;
        var bookmarkResource = this.sqliteStore.isBookmarked( this.post.url );
        if ( microsummary ) {
          this._mss.setMicrosummary ( bookmarkResource, microsummary );
        } else {
          if ( this._mss && this._mss.hasMicrosummary (bookmarkResource ) ) {
            this._mss.removeMicrosummary ( bookmarkResource );
          }
        }
   },
   
   _createBookmarkObject: function() {
      const NSArray = new Components.Constructor( "@mozilla.org/array;1", 
                                                  Components.interfaces.nsIMutableArray );
      const NSString = new Components.Constructor( "@mozilla.org/supports-string;1", 
                                                   Components.interfaces.nsISupportsString );
      var tags = new NSArray();
      var i, str;
      for( i = 0; i < this.post.tags.length; ++i ) {
         str = new NSString();
         str.data = this.post.tags[ i ];
         tags.appendElement( str, false );
      }
      return {
         name: this.post.title,
         url: this.post.url,
         description: this.post.notes,
         tags: tags.QueryInterface( Components.interfaces.nsIArray ),
         shared: this.post.shared,
         shortcut: this.post.shortcut,
         postData: this.post.postData
      };
   },
   
   _createBookmarkTransactionObject: function() {
      var transJSON = {
         name: this.post.title,
         url: this.post.url,
         description: this.post.notes,
         tags: this.post.tags ? this.post.tags.join(" ") : "",
         shared: this.post.shared,
         shortcut: this.post.shortcut,
         postData: this.post.postData,
         //localOnly : this.post.localOnly,
         recipients: this.post.recipients,
         share_msg: this.post.share_msg
      };
      return YBJSON.stringify(transJSON);
   },

   _dumpPost: function() {
      yDebug.print( "url: " + this.post.url );
      yDebug.print( "title: " + this.post.title );
      yDebug.print( "notes: " + this.post.notes );
      yDebug.print( "tags: " + this.post.tags );
      yDebug.print( "shared: " + this.post.shared );
      yDebug.print( "localOnly: " + this.post.localOnly );
      yDebug.print( "shortcut: " + this.post.shortcut );
   },

   cancelBookMark: function() {
     this._removeObservers(); 
     window.close();
   },

   _removeObservers: function() {
     if ( this._microsummaries ) {
       try {
         this._microsummaries.removeObserver( this._observer );
       } catch ( e ) {
       }
     }
   },

   _getPostTags: function() {
      if( this.post.tags == null ) {
         this.post.tags = new Array();
      }
      else {
         this.post.tags.length = 0;
      }

      this.post.tags = this.inputTagBox.value.split( /\s */ );
      if( this.editOp ) {
         if( this.post.systemTags ) {
            var i;
            for( i = 0; i < this.post.systemTags.length; ++i ) {
               this.post.tags.push( this.post.systemTags[ i ] );
            }
         }
		 if( this.post.forTags ) {
            var i;
			var len = this.post.forTags.length;
            for( i = 0; i < len; ++i ) {
               this.post.tags.push( this.post.forTags[ i ] );
            }
         }
      } else if( this.post.rss ) {
         yDebug.print ( "ADDING SYSTEM:RSS TO TAGS" );
         this.post.tags.push( this.config.rssTag );
      }
      
      if ( this.post.tags.length == 1 && !this.post.tags[0]) {
        this.post.tags = new Array();
        this.post.tags.push( this.config.emptyTag );
      }
      
   },

   _removeTag: function( tag, idx ) {
      var str = "";
      if( tag.length != this.inputTagBox.value.length ) {
         if( idx == 0 ) {
            str = this.inputTagBox.value.substr( tag.length + 1 );
         }
         else {
            str = this.inputTagBox.value.substr( 0, idx - 1 ) + 
               this.inputTagBox.value.substr( idx + tag.length );
         }
      }
      this.inputTagBox.value = str;      
   },

   _addToUserTags: function( tag ) {
      if( this.inputTagBox.value.length == 0 ) {
         this.inputTagBox.value = tag;
      }
      else {
         if (this.inputTagBox.value.charAt(this.inputTagBox.value.length-1) == " ")
           this.inputTagBox.value += tag;
         else 
           this.inputTagBox.value += " " + tag;
      }
      this.inputTagBox.value += " ";
   },

   _checkAddMechPref: function() {
      var prefVal = 1;
      try {
     prefVal = this.prefs.getIntPref( "extensions.ybookmarks@yahoo.addmechanism" );
      }
      catch( e ) { }
      return prefVal;
   },
   
   _traditionalAdd: function() {

      var notes = this.post.notes ? this.post.notes : this.getSelectedText();
      yDebug.print( "Ok, need to do traditional add for: url " + this.post.url +
            " and title: " + this.post.title + " plus notes:" + notes);

      var bundleService = 
            Components.classes[ "@mozilla.org/intl/stringbundle;1" ].getService( 
                Components.interfaces.nsIStringBundleService );
      var bundle = 
            bundleService.createBundle( "chrome://ybookmarks/locale/ybookmarks.properties" );

      var url;
      
      if (this.post.rss) {
        url = deliciousService.getPostRssUrl(this.post.url, this.post.title,
            notes, this.config.rssTag);
      } else {
        url = deliciousService.getPostUrl(this.post.url, this.post.title, notes);
      }
      yDebug.print( "Going to open url: " + url, YB_LOG_MESSAGE );
      
      var winW = this._prefs.getIntPref("extensions.ybookmarks@yahoo.addbookmark.windowWidth");
      var winH = this._prefs.getIntPref("extensions.ybookmarks@yahoo.addbookmark.windowHeight");
      
      if(winW < YB_ADDBOOKMARK_WINDOW_MIN_WIDTH) winW = YB_ADDBOOKMARK_WINDOW_MIN_WIDTH;
      if(winH < YB_ADDBOOKMARK_WINDOW_MIN_HEIGHT) winH = YB_ADDBOOKMARK_WINDOW_MIN_HEIGHT;
      
      this._openDelWindow( url, winW, winH );
   },

   _openDelWindow: function( url, width, height ){
      //make it center  
      var left = parseInt( ( screen.availWidth / 2 ) - ( width / 2 ) ); 
      var top  = parseInt( ( screen.availHeight / 2 ) - ( height / 2 ) );
      var props = "width=" + width + ",height=" + height + ",left=" + left + ",top=" + top +
         ",menubar=0,personalbar=0,toolbar=0,directories=0,scrollbars=0,location=1,status=1,resizable=1" 
      var newWindow = window.open( url, "", props );      
      setTimeout( "yAddBookMark.delWindowLoaded()", 0 );
   },
   
   delWindowLoaded: function( event ) {
      var wm = Components.classes[ "@mozilla.org/appshell/window-mediator;1" ]
                              .getService( Components.interfaces.nsIWindowMediator );
      var ref = wm.getMostRecentWindow( "navigator:browser" );
      ref.focus();
      ref.addEventListener( "unload", yAddBookMark.delWindowClosed, false );
            
      ref.addEventListener( "resize", function (event) {
         var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                              getService(Components.interfaces.nsIPrefBranch);

         if(event && event.target && event.target.outerWidth) {
            prefs.setIntPref("extensions.ybookmarks@yahoo.addbookmark.windowWidth", event.target.outerWidth);
         }
         
         //subtracting 68 px : workaround for window resizing happening from bookmarklet js
         //this will lead to inaccurate persistance of window height selected by user.
         if(event && event.target && event.target.outerHeight) {
            prefs.setIntPref("extensions.ybookmarks@yahoo.addbookmark.windowHeight", event.target.outerHeight-68);
         }
         
         }, false);
   },

   delWindowClosed: function( event ) {
      var syncService = ( Components.classes[this.kSyncServiceContractID].
                                 getService(Components.interfaces.nsIYBookmarkSyncService) );
      syncService.sync(false);
   },

   /** 
    * Clone of addBookmarkForBrowser from firefox source
    * This is necessary to override the bookmarking functionality
    */
   addBookmarkForTabBrowser: function( aTabBrowser ) {

     var webNav = aTabBrowser.webNavigation;
     var url = webNav.currentURI.spec;
     var title, description, charset;
     try {
       var doc = webNav.document;
       title = doc.title || url;
       charset = doc.characterSet;
       description = ybookmarksUtils.getDescriptionFromDocument( doc );
     } catch ( e ) {
       title = url;
     }

    
     this.open( url, title, charset, false, description );
   },

   addLiveBookmark: function(event) {
     var url = event.target.getAttribute('feed');
     var doc = gBrowser.selectedBrowser.contentDocument;
     var title = doc.title;
     var description = ybookmarksUtils.getDescriptionFromDocument(doc);
     event.stopPropagation();
     this.open(doc.baseURI, title, "", false, description, url);
   },

    /* copy of FF FeedHandler.buildFeedList. Required to add delicious options for adding livemarks */
   ybuildFeedList: function(arg) {
     var menuPopup = null;
     var addDeliciousOptions = true;
     menuPopup = arg;

     var parent = menuPopup.parentNode;
     if (parent) {
        if (parent.id == "subscribeToPageMenupopup") {
            addDeliciousOptions = false;
        }
     }
     var feeds = gBrowser.selectedBrowser.feeds;
     
     if (feeds == null) {
       menuPopup.parentNode.removeAttribute("open");
       return false;
     }

     while (menuPopup.firstChild)
       menuPopup.removeChild(menuPopup.firstChild);
    
        /**
         * Attempt to generate a list of unique feeds from the list of feeds
         * supplied by the web page. It is fairly common for a site to supply
         * feeds in multiple formats but with divergent |title| attributes so
         * we need to make a rough pass at trying to not show a menu when there
         * is in fact only one feed. If this is the case, by default select
         * the ATOM feed if one is supplied, otherwise pick the first one. 
         * @param   feeds
         *          An array of Feed info JS Objects representing the list of
         *          feeds advertised by the web page
         * @returns An array of what should be mostly unique feeds. 
         */
        function harvestFeeds(feeds) {
          var feedHash = { };
          for (var i = 0; i < feeds.length; ++i) {
            var feed = feeds[i];
            if (!(feed.type in feedHash))
              feedHash[feed.type] = [];
            feedHash[feed.type].push(feed);
          }
          var mismatch = false;
          var count = 0;
          var defaultType = null;
          for (var type in feedHash) {
            // The default type is whichever is listed first on the web page.
            // Nothing fancy, just something that works.
            if (!defaultType) {
              defaultType = type;
              count = feedHash[type].length;
            }
            if (feedHash[type].length != count) {
              mismatch = true;
              break;
            }
            count = feedHash[type].length;
          }
          // There are more feeds of one type than another - this implies the
          // content developer is supplying multiple channels, let's not do 
          // anything fancier than this and just return the full set. 
          if (mismatch)
            return feeds;

          // Look for an atom feed by default, fall back to whichever was listed
          // first if there is no atom feed supplied. 
          const ATOMTYPE = "application/atom+xml";
          return ATOMTYPE in feedHash ? feedHash[ATOMTYPE] : feedHash[defaultType];
        }

      //var feeds = harvestFeeds(feeds);
      var askForReader = true;
      try {
        var feedHandler = this.prefs.getCharPref("browser.feeds.handler");
        askForReader = ((feedHandler == "ask") || (feedHandler == "reader"));
      } catch ( e ) { }

      if ((!askForReader) && (feeds.length == 1)) {      
        var feedButton = document.getElementById("feed-button");
        if (feedButton)
            feedButton.setAttribute("feed", feeds[0].href);
        return false;
      }
      
      if (parent.id == "feed-button") {
        parent.removeAttribute("feed");
      }

     var strings = document.getElementById("ybookmarks-strings");
     // Build the menu showing the available feed choices for viewing.
     for (var i = 0; i < feeds.length; ++i) {
       var feedInfo = feeds[i];
       var baseTitle = feedInfo.title || feedInfo.href;
       // Add exisiting menu entries. 
       var menuItem = document.createElement("menuitem");
       var labelStr;
       try {
         labelStr = gNavigatorBundle.getFormattedString("feedShowFeed",[baseTitle]);
       } catch(e) {
         labelStr = gNavigatorBundle.getFormattedString("feedShowFeedNew",[baseTitle]);
       }           
       menuItem.setAttribute("label", labelStr);
       menuItem.setAttribute("feed", feedInfo.href);
       menuItem.setAttribute("tooltiptext", feedInfo.href);
       menuPopup.appendChild(menuItem);
       if ((askForReader) && (addDeliciousOptions == true)) {
           var menuItem = document.createElement("menuitem");
           var labelStr = strings.getFormattedString("extensions.ybookmarks.add.livemark", [baseTitle]);
           menuItem.setAttribute("label", labelStr);
           menuItem.setAttribute("feed", feedInfo.href);
           menuItem.setAttribute("tooltiptext", feedInfo.href);
           menuItem.setAttribute("oncommand", "yAddBookMark.addLiveBookmark(event)");       
           menuPopup.appendChild(menuItem);
       }       
     }
     return true;
   },

   resolveKeyword: function(aURL, aPostDataRef) {
       var bookmark = this.sqliteStore.getBookmarkFromShortcutURL(aURL.toLowerCase());
       if(bookmark) {
            if(bookmark.postData) {
                aPostDataRef.value = bookmark.postData;
            }
            
            return bookmark.url;
       }
       
       return null;
   },

   getShortcutOrURI: function(aURL, aPostDataRef) {
      try {      
        this._getLocalStore();
        var shortcutURL = this.resolveKeyword(aURL, aPostDataRef);
        if (!shortcutURL) {
          var aOffset = aURL.indexOf(" ");
          if (aOffset > 0) {
            var cmd = aURL.substr(0, aOffset);
            var text = aURL.substr(aOffset+1);
            shortcutURL = this.resolveKeyword(cmd, aPostDataRef);
            if (shortcutURL && text) {
              var encodedText = null; 
              var charset = "";
              const re = /^(.*)\&mozcharset=([a-zA-Z][_\-a-zA-Z0-9]+)\s*$/; 
              var matches = shortcutURL.match(re);
              if (matches) {
                 shortcutURL = matches[1];
                 charset = matches[2];
              }
              else if (/%s/.test(shortcutURL) || 
                       (aPostDataRef && /%s/.test(aPostDataRef.value))) {
                try {
                  charset = this.getLastCharset(shortcutURL);
                } catch (ex) {
                }
              }

              if (charset)
                encodedText = escape(convertFromUnicode(charset, text)); 
              else  // default case: charset=UTF-8
                encodedText = encodeURIComponent(text);

              if (aPostDataRef && aPostDataRef.value) {
                // XXXben - currently we only support "application/x-www-form-urlencoded"
                //          enctypes.
                aPostDataRef.value = unescape(aPostDataRef.value);
                if (aPostDataRef.value.match(/%[sS]/)) {
                  aPostDataRef.value = getPostDataStream(aPostDataRef.value,
                                                         text, encodedText,
                                                         "application/x-www-form-urlencoded");
                }
                else {
                  shortcutURL = null;
                  aPostDataRef.value = null;
                }
              }
              else {
                
                if (/%[sS]/.test(shortcutURL))
                  shortcutURL = shortcutURL.replace(/%s/g, encodedText)
                                           .replace(/%S/g, text);
                else {
                  // don't do any substitution, but still return the expanded url
                } 
              }
            }
          }
        }
                
        var origURL = this.originalGetShortcutOrURI(aURL, aPostDataRef);
        
          if (shortcutURL && origURL != aURL) {
              var warnCheck = this.prefs.getBoolPref("extensions.ybookmarks@yahoo.original.keyword.conflicts.warn");
              if (warnCheck) {
              var stringService = Components.classes["@mozilla.org/intl/stringbundle;1"].
                              getService(Components.interfaces.nsIStringBundleService);
              var strings = stringService.createBundle("chrome://ybookmarks/locale/ybookmarks.properties");
          
                var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
                       getService(Components.interfaces.nsIPromptService);
                var text = strings.GetStringFromName("extensions.ybookmarks.original.keyword.conflicts.text");
                var warn = strings.GetStringFromName("extensions.ybookmarks.original.keyword.conflicts.warn");
                var warnCheck = { value: true };
            
              promptService.alertCheck(window, "Delicious", text, warn, warnCheck);
  
                if (!warnCheck.value) {
                  this.prefs.setBoolPref("extensions.ybookmarks@yahoo.original.keyword.conflicts.warn", false);
                }
          
              } 
          }
        
        if (shortcutURL && origURL == aURL) {
          return shortcutURL;
        } else {
          yDebug.print("overridden getShortcutOrURI... Delegating");
          return origURL;
        }
      } catch (e) {
        yDebug.print("getShortcutOrURI(): " + e, YB_LOG_MESSAGE);
        try {
          return this.originalGetShortcutOrURI(aURL, aPostDataRef);
        } catch (e) {
          yDebug.print("getShortcutOrURI(): Even worse! error with this.originalGetShortcutOrURI(): " + e, YB_LOG_MESSAGE);
          return aURL;
        }
      }
  
   },

   addHooks: function() {
     yDebug.print("Inside AddHooks.", YB_LOG_MESSAGE);
     try {
     // put in our shortcut url handler
      //var topWindow = ybookmark_Utils._getTopWindow();

      // the mac seems to add the hooks in weird cases. For instance, if you bring up the
      // preferences window, it'll break the addressbar.  This is probably due
      // to the overlay being included in every new window ala this in chrome.manifest
      // overlay chrome://browser/content/macBrowserOverlay.xul chrome://ybookmarks/content/ybookmarksOverlay.xul
      var addHooks = true;
      if (ybookmarksUtils.getPlatform() == YB_PLATFORM_MAC) {  
        if ( !(window &&  window.content) ) {      
          // topWindow.browserDOMWindow && <-- took out this condition.  fix for bug 1071605
          addHooks = false;
          yDebug.print("Not adding Hook, Mac special case.", YB_LOG_MESSAGE);
          return;
        }
      }
             
      if (window.ybHooksAdded) {        
        yDebug.print("Not adding duplicate Hook.", YB_LOG_MESSAGE);
        return;
      }     
      
      if (window) {
        yDebug.print("Adding Livemark Hook.", YB_LOG_MESSAGE);
        if(window.FeedHandler) {
            window.FeedHandler.buildFeedList = 
                  function(event) { return yAddBookMark.ybuildFeedList(event); };
        }
      }
      if (yAddBookMark.originalGetShortcutOrURI == null) {
        yDebug.print("Adding ShortuctURI Hook.", YB_LOG_MESSAGE);
        if(window.getShortcutOrURI) {
            yAddBookMark.originalGetShortcutOrURI = window.getShortcutOrURI;        
            window.getShortcutOrURI = function(aURL, aPostDataRef) {
                  return yAddBookMark.getShortcutOrURI(aURL, aPostDataRef);
            };
        }
      } 
      window.ybHooksAdded = true;
    } catch (e) {
      yDebug.print("yAddBookmarks.addHooks():" + e, YB_LOG_MESSAGE);
    }
    },
   
   // This function has code copied from browser.js. Alas, there seems to be no
   // cleaner way to do this. The browser code is hardcoded to open it's own
   // add bookmark dialog. The code here is the same except for the last part
   // (where this function opens our dialog).
   createSearchKeywordBookmark: function () {
      yDebug.print( "yAddBookMark.createSearchKeywordBookmark called!" );
      var node = document.popupNode;
      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
      var uri = ioService.newURI(node.ownerDocument.URL, node.ownerDocument.characterSet, null);

      var keywordURL = ioService.newURI(node.form.getAttribute("action"), node.ownerDocument.characterSet, uri);
      var spec = keywordURL.spec;
      var postData = "";
      var i, e;

      if (node.form.method.toUpperCase() == "POST" &&
          (node.form.enctype == "application/x-www-form-urlencoded" || node.form.enctype == "")) {
         for (i=0; i < node.form.elements.length; ++i) {
            e = node.form.elements[i];
            if (e.type) {
               if (e.type.toLowerCase() == "text" || e.type.toLowerCase() == "hidden" ||
                   e instanceof HTMLTextAreaElement)
                  postData += escape(e.name + "=" + (e == node ? "%s" : e.value)) + "&";
               else if (e instanceof HTMLSelectElement && e.selectedIndex >= 0)
               postData += escape(e.name + "=" + e.options[e.selectedIndex].value) + "&";
               else if ((e.type.toLowerCase() == "checkbox" ||
                 e.type.toLowerCase() == "radio") && e.checked)
           postData += escape(e.name + "=" + e.value) + "&";
            }
         }
      }
      else {
         spec += "?" + escape(node.name) + "=%s";
         for (i=0; i < node.form.elements.length; ++i) {
            e = node.form.elements[i];
            if (e == node) { // avoid duplication of the target field value, which was populated above. 
               continue;
            }
            if (e.type) { 
               if (e.type.toLowerCase() == "text" || e.type.toLowerCase() == "hidden" ||
                   e instanceof HTMLTextAreaElement)
                  spec += "&" + escape(e.name) + "=" + escape(e.value);
               else if (e instanceof HTMLSelectElement && e.selectedIndex >= 0)
               spec += "&" + escape(e.name) + "=" + escape(e.options[e.selectedIndex].value);
               else if ((e.type.toLowerCase() == "checkbox" ||
                 e.type.toLowerCase() == "radio") && e.checked)
           spec += "&" + escape(e.name) + "=" + escape(e.value);
            }
         }
      }
      
      this.open( spec, "", null, null, null, null, false, postData, true );
   },

   /**
    * Get the top most browser window
    **/
   _getTopWindow : function() {
     var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
     var windowManagerInterface = windowManager.QueryInterface(Components.interfaces.nsIWindowMediator);
     var topWindow = windowManagerInterface.getMostRecentWindow( "navigator:browser" );

     return topWindow;
   },

   bookmarkTransactionsObserver : {
     
     observe: function(subject, topic, data) {
     
       if (topic == "ybookmark.processTransactions") {
         var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
                 getService(Components.interfaces.nsIWindowMediator);
         var recentWindow = wm.getMostRecentWindow("navigator:browser");
         if (recentWindow != window) {
           return;
         }
           
         window.setTimeout(yAddBookMark.processTransactions, 0);
       }
     }
   },
   
   processTransactions : function() {
      
      if(this != yAddBookMark) {
        yAddBookMark.processTransactions();
        return;
      }
      
      this._getSyncService();
      this.syncService.processTransactions();
   },
   
   saveSearchString: function () {
   	 var temp = this.inputTagBox.value.split(" ");
   	 temp.pop();
   	 this.inputTagBox.setAttribute("savedSearchString", temp.join(" "));
   },
   
   prependSavedSearchString: function () {
   	var tmp = this.inputTagBox.getAttribute("savedSearchString");
   	
   	if(tmp) tmp = tmp + " ";
   	
   	this.inputTagBox.value =  tmp + this.inputTagBox.value;
   }
   
};

function ybUpdateSendList(event) {
   var sendbox = document.getElementById("tb_yBookmarkSend");
   var tagBox = document.getElementById("tb_ybTags");	
   if(sendbox && (event.originalTarget != sendbox)) {
      if(sendbox.value != '') {
         var tmp = document.commandDispatcher.focusedElement;
         sendbox.addTag(sendbox.value);
         sendbox.value = '';	
         if(tmp) {
			tmp.focus();
		 }
      }
	  if(!tagBox && (event.originalTarget != tagBox)) {
		var tmp = document.commandDispatcher.focusedElement;
	 	ybAddBkShare.checkForRecipients();
		if(tmp) {
			tmp.focus();
		}
	  }	
   }
}