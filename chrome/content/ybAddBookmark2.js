var ybOnOK = null;

function ybAddHook() {
    ybOnOK = onOK;
    onOK = function() { ybOnOK();
                        ybHook(); };
}

function isEngineInstalled() {
      var installed = false;
      var strings = document.getElementById("ybookmarks-strings");
      var newVersionNum = strings.getString("extensions.ybookmarks.versionNum");
      yDebug.print("ybAddBookmark.js::isEngineInstalled()=>newVersionNum= "+newVersionNum,
      		YB_LOG_MESSAGE);
      try {
      	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefBranch);
      	var oldVersionNum = prefs.getCharPref("extensions.ybookmarks@yahoo.version.number");
      	   	yDebug.print("ybAddBookmark.js::isEngineInstalled()=>oldVersionNum= "+oldVersionNum,
      		YB_LOG_MESSAGE);
   
      }catch (e){
      	yDebug.print("ybAddBookmark.js::isEngineInstalled() =>Engine not installed",
      		YB_LOG_MESSAGE);
      }               
      if(newVersionNum == oldVersionNum){
  		installed = true;
		yDebug.print("ybAddBookmark.js::isEngineInstalled() =>Engine installed",
      		YB_LOG_MESSAGE);
   	  }
   	  return installed;
}

function ybHook() {
  try {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                  getService(Components.interfaces.nsIPrefBranch);         
    
    if (!isEngineInstalled()) {
      return;
    } 
    
    var remindCheck = prefs.getBoolPref("extensions.ybookmarks@yahoo.original.add.suggest.delicious");
    if (remindCheck) {
  	  var strings = document.getElementById("ybookmarks-strings");
  	  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
  	                        getService(Components.interfaces.nsIPromptService);

  	  var title = strings.getString("extensions.ybookmarks.original.add.dialog.hook.title");
  	  var text = strings.getString("extensions.ybookmarks.original.add.dialog.hook.text");
  	  var remind = strings.getString("extensions.ybookmarks.original.add.dialog.hook.remind");    
      remindCheck = { value: true };
      var promptFlags = (promptService.BUTTON_TITLE_NO * promptService.BUTTON_POS_0) +
                        (promptService.BUTTON_TITLE_YES * promptService.BUTTON_POS_1) +
                        promptService.BUTTON_POS_1_DEFAULT;
                      
  	  var addToDel = promptService.confirmEx(this, title, text, promptFlags, "", "", "", remind, remindCheck);

/*  	  yDebug.print("hooked!: add: " + addToDel +  " remind: " +  remindCheck.value);*/
      
      if (!remindCheck.value) {
        prefs.setBoolPref("extensions.ybookmarks@yahoo.original.add.suggest.delicious", false);
      }
      
  	  if (addToDel == 1) {
  	    //url, title, charset, isWebPanel, notes, feedUrl, blankEntry, postData, keywordInput 
	      yAddBookMark.open(gArg.url, gArg.name, gArg.charset, gArg.bWebPanel, gArg.description, gArg.feedURL, false, gArg.postData, gArg.bNeedKeyword);
  	  }
    }
	
  } catch (e) {
    yDebug.print("ybHook" + e, YB_LOG_MESSAGE);
  }
}

window.addEventListener("load", ybAddHook, false);
