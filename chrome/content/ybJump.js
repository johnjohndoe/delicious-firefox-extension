function jumpToTag() {
   	var prefService =
        Components.classes["@mozilla.org/preferences-service;1"]
                  .getService(Components.interfaces.nsIPrefBranch);
 	var tagType = prefService.getCharPref("extensions.ybookmarks@yahoo.jump.tagType");
 	
 	if(tagType == "user") {
		ybookmarksUtils.openLinkToNewTab(deliciousService.getUrl(deliciousService.getUserName() + "/" + encodeURIComponent(document.getElementById('ybJumpControl').value)));
 	}
 	else if(tagType == "recent") {
		ybookmarksUtils.openLinkToNewTab(deliciousService.getUrl("tag/" + encodeURIComponent(document.getElementById('ybJumpControl').value)));
 	}
}