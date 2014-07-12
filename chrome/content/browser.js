let DeliciousSB = { 
   onCommand: function(event) {
     dump("Hello world!\n");
   }, 
   loadPage: function(url) {
     dump("loading page "+url+"\n");
     window.content.location=url;
   }
};
