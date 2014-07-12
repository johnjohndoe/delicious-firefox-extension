
var YBreqRestartManager = {


  _onLoad : function() {       
      var bundle = document.getElementById( "strbndl_restartManager");        
      var serviceName = deliciousService.getServiceName();            
      var str = bundle.getString("extensions.ybookmarks.reqRestart.message");
      ( document.getElementById( "desc_mainText" ) ).appendChild( document.createTextNode( str ) );      
      str = bundle.getFormattedString( "extensions.ybookmarks.reqRestart.dialog.title", 
                                       [ serviceName ] );
      document.title = str;
  },
  
  _restart : function() {   
  	  window.opener._userSelection = "restart";    
      window.close(); 
  },
  
  _restartLater : function() {             
      window.close();
  }
};
