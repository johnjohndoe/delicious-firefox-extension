const YB_PREFIX_STRING_NAME = "extensions.ybookmarks.serverError."

var YBserverError = {
  
  _status : "",
  _action : "",
  
  init : function() {
    
    var data = window.arguments[0];    
    YBserverError._status = data.status;
    YBserverError._action = data.action;
    YBserverError._setText();
    
    window.sizeToContent();
    yDebug.print("Load server error dialog", YB_LOG_MESSAGE);
  },
  
  _setText : function() {
  
    var stringBundle = document.getElementById("serverErrorStringBundle");
    var serverErrorElement = document.getElementById("serverError");
    var errorMessageElement = document.getElementById("errorMessage");
    var stringName = YB_PREFIX_STRING_NAME;
    if (this._status == "414") {
      stringName += (this._status + ".");
      switch (this._action) {
        case "addBookmark":
          errorMessageElement.appendChild(
            document.createTextNode(
              stringBundle.getString(stringName + "addBookmark.label")
            )
          );
        break;
        case "editBookmark":
          errorMessageElement.appendChild(
            document.createTextNode(
              stringBundle.getString(stringName + "editBookmark.label")
              )
            );     
        break;
        case "deleteBookmark":
          errorMessageElement.appendChild(
            document.createTextNode(
              stringBundle.getString(stringName + "deleteBookmark.label")
            )
          );        
        break;
      }
      var error = stringBundle.getString(YB_PREFIX_STRING_NAME + this._status + ".label");
      var errorName = stringBundle.getFormattedString(YB_PREFIX_STRING_NAME + "error.label", 
        [error]); 
      serverErrorElement.appendChild(document.createTextNode(errorName));
    }
  },
  
  accept : function() {
    yDebug.print("Close server error dialog", YB_LOG_MESSAGE);
    window.close();
  }
}