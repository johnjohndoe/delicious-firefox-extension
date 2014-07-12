var YB_DEBUG_MESSAGE = 1;
var YB_LOG_MESSAGE = 2;

function myLogToConsole(aMessage, aSourceName, aSourceLine, aLineNumber, 
                        aColumnNumber, aFlags, aCategory)
{
  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                 .getService(Components.interfaces.nsIConsoleService);
  var scriptError = Components.classes["@mozilla.org/scripterror;1"]
                              .createInstance(Components.interfaces.nsIScriptError);
  scriptError.init(aMessage, aSourceName, aSourceLine, aLineNumber, 
                   aColumnNumber, aFlags, aCategory);
  consoleService.logMessage(scriptError);
}

var yDebug = {
   _initialized: false,
   _dbgService: null,
   _init: function() {
      try {
         this._dbgService = Components.classes[ "@mozilla.org/ybookmarks-debug-service;1" ];
         this._dbgService = this._dbgService.getService( Components.interfaces.nsIYDebugService );
         this._consoleService = Components.classes[ "@mozilla.org/consoleservice;1" ];
         this._consoleService = this._consoleService.getService( Components.interfaces.nsIConsoleService );
         this._initialized = true;
      }
      catch( e ) {
      }
   },

   Timer: function( name ) {
       var t1, t2, delta, total = 0, count = 0;
       this.start  = function() { ++count; t1 = new Date(); return this; };
       this.end    = function() { t2 = new Date(); delta = t2 - t1; total += delta; return this; };
       this.print  = function() { 
           if (count > 1) {
               /*
               repl.print("Timer (" + name + "): " + delta + " ms" +
                            "; called " + count + " times" +
                            "; total: " + total + " ms" +
                            "; avg time per call: " + (total / count) + " ms"
                            ); 
               */
               yDebug.print("Timer (" + name + "): " + delta + " ms" +
                            "; called " + count + " times" +
                            "; total: " + total + " ms" +
                            "; avg time per call: " + (total / count) + " ms"
                            ); 
           } else {
               /*
               repl.print("Timer (" + name + "): " + delta + " ms");
               */
               yDebug.print("Timer (" + name + "): " + delta + " ms");
           }
       };
   },

   timedFunc: function( func, desc ) {
        if (typeof arguments.callee.timer == "undefined") {
            arguments.callee.timer = {};
        }
        var id = desc || func.desc || func.name;
        if (typeof arguments.callee.timer[id] == "undefined") {
            arguments.callee.timer[id] = new yDebug.Timer(id);
        }
        var timer = arguments.callee.timer[id];

        return function() {
            timer.start();
            var ret = func.apply(null, arguments);
            timer.end();
            timer.print();
            return ret;
        };
   },

   on: function( refresh ) {
      if( !this._initialized ) {
         this._init()
      }
      if( this._initialized ) {
         if( refresh == null ) {
            refresh = false;
         }
         return this._dbgService.on( refresh );
      }
      return false;
   },
   
   print: function( message, type ) {
      if( !this._initialized ) {
         this._init()
      }
      if( this._initialized ) {
          var stackFrame = Components.stack.caller;
          var filename = stackFrame.filename;
/*          if (filename.indexOf("ybSidebarOverlay.xml") < 0 && filename.indexOf("Debug") < 0) return;*/
         if( type == null ) {
            type = YB_DEBUG_MESSAGE;
         }
         if( type == YB_LOG_MESSAGE ) {
            this._dbgService.printLog( message );
         }
         else {
            if( this._dbgService.on()) {
                // var stackFrame = Components.stack.caller;
                // var filename = stackFrame.filename;
                // if (filename == "ybSidebarOverlay.xml") {
                    var lineNumber = stackFrame.lineNumber;
                    var columnNumber = stackFrame.columnNumber;
                    myLogToConsole(message, filename, null, lineNumber, columnNumber, Components.interfaces.nsIScriptError.warningFlag, 1);
                    this._dbgService.printDebug( message );
                    // }
            }
         }
      }
   },

   printStack: function(message) {
        var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                 .getService(Components.interfaces.nsIConsoleService);

        var stackFrame = Components.stack.caller;
        var arr = [message];
        var msg;
        while (stackFrame) {
            var filename = stackFrame.filename;
            if (filename == null) break;
            var lineNumber = stackFrame.lineNumber;
            arr.push("    " + filename + ":" + lineNumber);
            stackFrame = stackFrame.caller;
        }

        msg = arr.join("\n");
        stackFrame = Components.stack.caller;
        lineNumber = stackFrame.lineNumber;
        columnNumber = stackFrame.columnNumber;
        filename = stackFrame.filename;
        myLogToConsole(msg, filename, null, lineNumber, columnNumber, Components.interfaces.nsIScriptError.errorFlag, 1);
        this._dbgService.printLog( msg );
   },

   assert: function( boolValue, msg ) {
        if (boolValue) return true; 
        else {
            msg = "Assertion failed: " + msg;
            var stackFrame = Components.stack.caller.caller;
            var filename = stackFrame.filename;
            var lineNumber = stackFrame.lineNumber;
            var columnNumber = stackFrame.columnNumber;
            
            // yDebug.print(msg);
            myLogToConsole(msg, filename, null, lineNumber, columnNumber, Components.interfaces.nsIScriptError.errorFlag, 1);
            return false;
        }
   },
   
   /* below to be used only for debugging*/
   printOutArcs: function( datasource, resource ) {

   	  yDebug.print( " *********************" );
   	  var properties = datasource.ArcLabelsOut( resource );


   	  while ( properties.hasMoreElements() ) {
   	    var s = properties.getNext();
   	    s.QueryInterface( Components.interfaces.nsIRDFResource );
   	    var target = datasource.GetTarget ( resource, s, true );
   	    try {
   	      target.QueryInterface ( Components.interfaces.nsIRDFLiteral );
   	      yDebug.print ( "Literal:" + s.Value + " => " + target.Value);
   	    } catch (e) {
   	      try {
   	        target.QueryInterface ( Components.interfaces.nsIRDFResource );
   	        yDebug.print ( resource.Value + ": Resource => " + s.Value + " => " + target.Value );
   	      } catch (e) {

   	        try {
   	          target.QueryInterface ( Components.interfaces.nsIRDFDate );
   	          yDebug.print ( "Date: " + s.Value + " => " + target.Value );
   	        } catch (e) {
   	        }

   	      }
   	    }

   	  }
   },
   
    printObject: function(aObject, message) {
        var str = "";
        if (!message) message = "";
        str += message + ": ";     
        if (aObject == null) {
            str += "(null)";
            yDebug.print(str);
            return;
        }
        str += "{\n";
        for (var prop in aObject) {
            if (aObject.hasOwnProperty(prop)) {
                str += "    [" + prop + "]: " + "\"" + aObject[prop] + "\"\n";
            }
        }
        str += "}\n";
        yDebug.print(str);
    }
   
};
