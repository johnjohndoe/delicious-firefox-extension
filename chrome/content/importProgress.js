var ybImportProgress = {
  wizStrings: null,
  ssr: null,
  done: false,
  
  onLoad: function() {
      try {
        var status = window.arguments[0];
        
        document.getElementById('yb-import-progress-tour-link').
             addEventListener( 'click', this.openTour, false );
        
        
        /*
        var kDelContractID = "@yahoo.com/socialstore/delicious;1";
        var kStringContractID = "@mozilla.org/supports-string;1";
        var kIString = Components.interfaces.nsISupportsString;
        var NSString = new Components.Constructor(kStringContractID, kIString);
        this.ssr = Components.classes[kDelContractID].
             getService(Components.interfaces.nsISocialStore);
        this.wizStrings = document.getElementById( "yb-wizard-strings");
        this.progressMeterCallback._ybImportProgress = this;
        
        var bookmarksFilename = window.arguments[0]["bookmarksFilename"];
        var userTags = window.arguments[0]["userTags"];
        var addPopularTags = window.arguments[0]["addPopularTags"];
         var overwrite = window.arguments[0]["overwrite"];
       
       // alert(bookmarksFilename);
        var bookmarksString = ybookmarksUtils.fileContentsAsString(bookmarksFilename);
            
        var xpcUserTags = Components.classes["@mozilla.org/array;1"]
                            .createInstance(Components.interfaces.nsIMutableArray);
        //alert("ut.length:" + userTags.length + " | " + (typeof userTags[0]));
        for (var i = 0; i < userTags.length; i++) {
          var tag = new NSString();
          
          tag.data = userTags[i]
          xpcUserTags.appendElement(tag, false);
        }
        
        this.progressImporting();
        this.ssr.importBookmarks(
           bookmarksString, xpcUserTags, addPopularTags, overwrite, this.progressMeterCallback);
        */
        this.updateStatus(status);
        document.documentElement.getButton( "accept" ).focus();
      } catch (e) { 
  
        yDebug.print("ybImportProgress.onLoad: " + e, YB_LOG_MESSAGE);
  
      }
  
  },
  
  openTour: function () {
     openUILinkIn(deliciousService.getTourUrl(), "tab");
  },
  
  updateStatus: function(status) {
    try {
      var success = document.getElementById("yb-import-progress-success");
      var failure = document.getElementById("yb-import-progress-failure");
      var importing = document.getElementById("yb-import-progress-importing");
      
      if (status == "complete") {
        success.hidden = false;
        failure.hidden = true; 
        importing.hidden = true;
        
      } else if (status == "failed") {
        success.hidden = true;
        failure.hidden = false;
        importing.hidden = true;
        
      } else if (status == "importing") {
        success.hidden = true;
        failure.hidden = true;
        importing.hidden = false;
      
      } else {
        // we should never be here
        success.hidden = false;
        failure.hidden = false;
        importing.hidden = false;
        yDebug.print("importProgress.updateStatus(): invalid status: " + status, YB_LOG_MESSAGE)
        
      }
      
      } catch (e) { 
      yDebug.print(e);
    }
    /*
     if (this != ybImportProgress) {
        return ybImportProgress.updateStatus();
     }
     
     if (!this._done) {
        this.ssr.getImportStatus(this.progressMeterCallback);

        var STATUS_REFRESH = 500;

        window.setTimeout(this.updateStatus, STATUS_REFRESH);
     }*/
  },
  
  progressImporting: function() {
    var status = document.getElementById("yb-import-progress-status");
    status.value = this.wizStrings.getFormattedString("extensions.ybookmarks.import.progress.status.importing", []);
  },
  
  progressComplete: function() {
    var status = document.getElementById("yb-import-progress-status");
    status.value = this.wizStrings.getFormattedString("extensions.ybookmarks.import.progress.status.complete", []);
    this._done = true;
  },
  
  progressFailed: function (event) {
    var status = document.getElementById("yb-import-progress-status");
    status.value = this.wizStrings.getFormattedString("extensions.ybookmarks.import.progress.status.failed", []);
    
  },
  
  progressMeterCallback: {
    _ybImportProgress: null,
    
    onload: function(result) {
      var propertyBag = result.queryElementAt(0, Components.interfaces.nsIPropertyBag);
      var status = propertyBag.getProperty("status");

      switch(status) {
        case "complete":
          this._ybImportProgress.progressComplete();
          break;
          
        case "importing":
          this._ybImportProgress.progressImporting();
          break;
          
        case "failed":
          this._ybImportProgress.progressFailed();
          break;
      }
      
    },
    
    onerror: function(event) {
      this._ybImportProgress.progressFailed(event);
      //TOD: deal with the error
    }
    
  }
  
};

window.addEventListener("load", function() { ybImportProgress.onLoad() }, false);
