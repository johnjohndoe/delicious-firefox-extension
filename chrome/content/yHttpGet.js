function yHttpGet(url, cb) {
	this._url = url;
	this._htppRequest = null;
	this._sendRequest(cb);
}

yHttpGet.prototype = {

_url : null,
_htppRequest : null,	

_sendRequest : function(cb) {
	var onload = function(event) {
		if (event.target.status != 200) {    	 
        	cb.onerror(event);
     	}
		cb.onload(event);		
	};
	var onerror = function(event) {
		cb.onerror(event);
	};
	
	this._htppRequest = new XMLHttpRequest();
	this._htppRequest.open("GET", this._url, true);
	this._htppRequest.onload = onload;
    this._htppRequest.onerror = onerror;    
    this._htppRequest.send(null);
},

abortRequest : function() {
	if(this._htppRequest) {
 		this._htppRequest.abort();
	}
}

};