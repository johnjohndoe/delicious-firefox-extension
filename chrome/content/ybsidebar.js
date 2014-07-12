var YBSidebar = {

   onload : function() {   	    
     
     if(ybookmarksUtils.getExtensionMode() == YB_EXTENSION_MODE_CLASSIC)  {
	     // close sidebar for clasic version.
	     var sidebar = ybookmarksUtils.getTopWindow().document.getElementById("sidebar-box");	     
	     if (!sidebar.hidden) {
	        ybookmarksUtils.getTopWindow().toggleSidebar('viewYBookmarksSidebar', false);
	     }			
     } else {
     	var panel = document.getElementById("ybSidebarPanel");
	     if (panel) {
	       panel.setSearchBoxFocus();            
	     }
     }
   },
   
   //Assuming use from toolbar button alone.
   openSideBar :  function(bool) {
     ybookmarksUtils.getTopWindow().toggleSidebar('viewYBookmarksSidebar', false);
   }    
}



