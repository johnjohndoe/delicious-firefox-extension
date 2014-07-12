var ybImportBookmarks = {
  
  filePicker: null,
  _args: null,
  _bookmarks: null,
  _strings: null,
  
  onLoad: function() {
      try {
        if (window.arguments) {
    	    this._args = window.arguments[0];
	        this._bookmarks = this._args.bookmarks;
        }
	      this._strings = document.getElementById("yb-strings");
	      
	      if (this._bookmarks) {
	        var fileBox = document.getElementById("yb-import-bookmarks-filepicker-box");
	        fileBox.setAttribute("hidden", true);
	        var bookmarksBox = document.getElementById("yb-import-bookmarks-bookmarks-box");
	        bookmarksBox.setAttribute("hidden", false);
	        
	        var bmDesc = document.getElementById("yb-import-bookmarks-description");
	        var bmString = this._strings.getFormattedString("extensions.ybookmarks.import.bookmarks.number", [this._bookmarks.length]);
	        bmDesc.appendChild(document.createTextNode(bmString));
	        
	        var hasImported = 0;
	        for (var i=0; i < this._bookmarks.length; i++) {
	          if (this._bookmarks[i].imported) {
	            hasImported++;
	          }
	        }
	        
	        if (hasImported > 0) {
	          var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
                   getService(Components.interfaces.nsIPromptService);
            var text = this._strings.getFormattedString("extensions.ybookmarks.import.bookmarks.alreadyimported", [ hasImported ]);
            setTimeout(function() {
                        promptService.alert(this, "Delicious", text);
                      },
                      250);
	        }
	        
	        yDebug.print("importing " + this._bookmarks.length + " bookmarks");
	      } else {
	        this.toggleFileChoice();
	        yDebug.print("importing from file");
	        
	      }  
      } catch (e) {
        yDebug.print("ybImportBookmarks.onLoad(): " + e);
      }
    
  },
  
  genBookmarkArgsFromResources: function(aBmResources) {
    const rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].
                    getService(Components.interfaces.nsIRDFService);                  
    const bmDataSource = Components.classes["@mozilla.org/rdf/datasource;1?name=bookmarks"]
                        .getService(Components.interfaces.nsIRDFDataSource);

    const rsrcName          = rdfService.GetResource("http://home.netscape.com/NC-rdf#Name");
    const rsrcIcon          = rdfService.GetResource("http://home.netscape.com/NC-rdf#Icon");
    const rsrcURL           = rdfService.GetResource("http://home.netscape.com/NC-rdf#URL");
    const rsrcDescription   = rdfService.GetResource("http://home.netscape.com/NC-rdf#Description");
    const rsrcShortcutURL   = rdfService.GetResource("http://home.netscape.com/NC-rdf#ShortcutURL");
    const rsrcAddDate       = rdfService.GetResource("http://home.netscape.com/NC-rdf#BookmarkAddDate"); 
    const rsrcLastModDate   = rdfService.GetResource("http://home.netscape.com/WEB-rdf#LastModifiedDate"); 
    const rsrcLastVisitDate = rdfService.GetResource("http://home.netscape.com/WEB-rdf#LastVisitDate");                     
    const rsrcWebPanel      = rdfService.GetResource("http://home.netscape.com/NC-rdf#WebPanel");
    const rsrcLastCharset   = rdfService.GetResource("http://home.netscape.com/WEB-rdf#LastCharset");
    const rsrcFeedURL       = rdfService.GetResource("http://home.netscape.com/NC-rdf#FeedURL");
    
/*    const rsrcType          = rdfService.GetResource("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    const rsrcLivemark      = rdfService.GetResource("http://home.netscape.com/NC-rdf#Livemark");
    const rsrcLivemarkExpiration = rdfService.GetResource("http://home.netscape.com/NC-rdf#LivemarkExpiration");
    const rsrcForwardProxy  = rdfService.GetResource("http://developer.mozilla.org/rdf/vocabulary/forward-proxy#forward-proxy");
*/      
    const getTargetValue = function(source, property) {
      var node = bmDataSource.GetTarget(source, property, true);
      var result = null;
      
      if (node) {
        try {
          node.QueryInterface(Components.interfaces.nsIRDFLiteral);
          result = node.Value;
        } catch (e) {
          try{
            node.QueryInterface(Components.interfaces.nsIRDFDate);
            result = node.Value;
          } catch (e) { }
        }
      } 
      return result;
    };  
    
    var bookmarks = [];
    
    for (var i=0; i < aBmResources.length; i++) {
      var bmRsrc        = aBmResources[i].rsrc;
      bmRsrc.QueryInterface(Components.interfaces.nsIRDFResource);
//      yDebug.printOutArcs(bmDataSource, bmRsrc);
      
      var name          = getTargetValue(bmRsrc, rsrcName);
      var url           = getTargetValue(bmRsrc, rsrcURL);
      var feedUrl       = getTargetValue(bmRsrc, rsrcFeedURL);
      var description   = getTargetValue(bmRsrc, rsrcDescription);
      var shortcutUrl   = getTargetValue(bmRsrc, rsrcShortcutURL);
      var icon          = getTargetValue(bmRsrc, rsrcIcon);
      var addDate       = getTargetValue(bmRsrc, rsrcAddDate);
      var lastModDate   = getTargetValue(bmRsrc, rsrcLastModDate);
      var lastVisitDate = getTargetValue(bmRsrc, rsrcLastVisitDate);
      var lastCharSet   = getTargetValue(bmRsrc, rsrcLastCharset);
      var webPanel      = getTargetValue(bmRsrc, rsrcWebPanel);
      
      if (addDate) {
        addDate = addDate / 1000000;
      }
      if (lastModDate) {
        lastModDate = lastModDate / 1000000;
      }
      if (lastVisitDate) {
        lastVisitDate = lastVisitDate / 1000000;
      }
      bookmarks.push({ id: bmRsrc.Value,
                       name: name,
                       url: url,
                       feedUrl: feedUrl,
                       description: description,
                       shortcutUrl: shortcutUrl,
                       addDate: addDate,
                       lastModDate: lastModDate,
                       lastVisitDate: lastVisitDate,
                       icon: icon,
                       webPanel: webPanel });
    }  
    
  return bookmarks;
  },
  
  /* Our poor man's bookmark file generator */
  genBookmarksString: function(bookmarks) {
    var result = "<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV=\"Content-Type\" CONTENT=\"text/html; charset=UTF-8\">\n<TITLE>Bookmarks by Bookmonkey</TITLE>\n";
    
/*    result += "<H1 LAST_MODIFIED=\"" + (new Date().getTime() / 1000) + "\">Bookmarks</H1>\n<DL><p>";*/
    
    for (var i=0; i < bookmarks.length; i++) {
      var bm = bookmarks[i];
    
      var bmString = "<DT><A HREF=\"" + bm.url + "\"";
      
      if (bm.addDate) {
        bmString += " ADD_DATE=\"" + bm.addDate + "\"";
      }

      if (bm.lastVisitDate) {
        bmString += " LAST_VISIT=\"" + bm.lastVisitDate + "\"";
      }
      
      if (bm.lastModDate) {
        bmString += " LAST_MODIFIED=\"" + bm.lastModDate + "\"";
      }
      
      if (bm.feedUrl) {
        bmString += " FEEDURL=\"" + bm.feedUrl + "\"";
      }
      
      if (bm.shortcutURL) {
        bmString += " SHORTCUTURL=\"" + bm.shortcutURL + "\"";
      }
      
      if (bm.icon) {
        bmString += " ICON=\"" + bm.icon + "\"";
      }
      
      if (bm.webPanel) {
        bmString += " WEBPANEL=\"true\"";
      }                     
      
      if (bm.lastCharset) {
        bmString += " LAST_CHARSET=\"" + bm.lastCharset + "\"";
      }
      
      if(bm.id) {
        bmString += " ID=\"" + bm.id + "\"";
      }
      
      bmString += ">" +  bm.name + "</A>\n";
  
      if (bm.description) {
        bmString += "<DD>" + bm.description + "\n";
      }
      
      result += bmString;
    }
    
    result += "\n</DL><p>";    
    return encodeURIComponent(result);
  },
  
  onOk: function() {
    try {
      
      var options = document.getElementById("yb-import-options");
      
      var args = { addTags: (options.addTags ? options.addTagsAsArray : []), 
                   addPopularTags: options.addPopularTags, 
                   replaceDuplicates: options.replaceDuplicates,
                   priv: 1 } ;
      
      if (this._bookmarks) {
        yDebug.print("bookmark import (" + this._bookmarks.length + ")");

        if(ybookmarksUtils.getFFMajorVersion() > 2) {
    		var bookmarkArgs = this._bookmarks;
        } else {
	        var bookmarkArgs = this.genBookmarkArgsFromResources(this._bookmarks);        	
        }

        args.bookmarksString = this.genBookmarksString(bookmarkArgs);
        yDebug.print(args.bookmarksString);  
      } else {     
        yDebug.print("file import");
  		  var radioGroup = document.getElementById("yb-import-source");
        var file = document.getElementById("yb-import-source-file");
        var firefox = document.getElementById("yb-import-source-firefox");

        var filePath = null;
      
        if (radioGroup.selectedItem == file) {
          filePath = document.getElementById("yb-import-source-file-path").value;
        }
  	   
        args.filePath = (filePath ? filePath : "");
      
      }
      
      var os = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
      var xpcArgs = Components.classes["@mozilla.org/supports-string;1"].
          	                    createInstance(Components.interfaces.nsISupportsString);
      var xpcSubject = Components.classes["@mozilla.org/supports-string;1"].
          	                    createInstance(Components.interfaces.nsISupportsString);
                                xpcSubject.data = "startImport";
      xpcArgs.data = YBJSON.stringify(args);
      os.notifyObservers(xpcSubject, "ybookmark.importBookmarks", xpcArgs);
        
    } catch (e) { 
    	 yDebug.print("importBookmarks.onOk(): " + e);
    }
      
  },
  
  chooseFile: function() {
    try {
      var nsIFilePicker = Components.interfaces.nsIFilePicker;
      
      if (!this.filePicker) {
        this.filePicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        this.filePicker.init(window, "Select a File", nsIFilePicker.modeOpen);
        this.filePicker.appendFilters(nsIFilePicker.filterHTML | nsIFilePicker.filterXML | nsIFilePicker.filterAll);
      }
      var res = this.filePicker.show();
      if (res == nsIFilePicker.returnOK) {
        var file = this.filePicker.file;
        var filePath = document.getElementById("yb-import-source-file-path");
        
        filePath.value = file.path;
      }
      
      
    } catch (e) {}
  
  },
  
  toggleFileChoice : function () {
    try {
    	var radioGroup = document.getElementById("yb-import-source");
	    var file = document.getElementById("yb-import-source-file");
	    var filePath = document.getElementById("yb-import-source-file-path");
	    var fileChoose = document.getElementById("yb-import-source-file-choose");
	    
	    if (radioGroup.selectedItem == file) {
	      fileChoose.disabled = filePath.disabled = false;
	    } else {
	      fileChoose.disabled = filePath.disabled = true;
	    }
	    
	    this.updateOkButton();} catch (e) { 
              yDebug.print(e, YB_LOG_MESSAGE);
    }
    
  },
  
  updateOkButton: function() {
    try {
      var ok;
      var radioGroup = document.getElementById("yb-import-source");
      var file = document.getElementById("yb-import-source-file");
      if (radioGroup.selectedItem == file) {
        ok = /\S/.test( document.getElementById("yb-import-source-file-path").value );
      } else {
        ok = true;
      }
      document.documentElement.getButton( "accept" ).disabled = !ok;
  } catch (e) { 
    yDebug.print(e, YB_LOG_MESSAGE);
    }
    }
};

window.addEventListener("load", function() { ybImportBookmarks.onLoad() }, false);
