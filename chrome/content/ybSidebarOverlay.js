var ybsidebar = {
  
  lastSidebarSearchValue : "", //the last search term used on the sidebar / not overlay popup.  
  _prefService : null,
  
   onLoad: function() {
      yDebug.print("Loading sidebar");
      
      ybsidebar._prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                 .getService(Components.interfaces.nsIPrefBranch);
      var hideFFBMMenu = false;
      try {
        hideFFBMMenu = ybsidebar._prefService.getBoolPref("extensions.ybookmarks@yahoo.original.ui.hide");
      } catch ( e ) {}
      yDebug.print("Sidebar loaded", YB_LOG_MESSAGE);
   },
   
   onUnload : function() {
   },
   
   closeSidebar : function() {
     toggleSidebar('viewYBookmarksSidebar');
   }
};

window.addEventListener("load", ybsidebar.onLoad, false);
window.addEventListener("unload", ybsidebar.onUnload, false);
