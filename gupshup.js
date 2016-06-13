/** This is a sample code for your bot**/
	    function MessageHandler(context, event) {
	        context.console.log("test")
	        if(event.message.toLowerCase() == "httptest") {
	            context.simplehttp.makeGet("http://ip-api.com/json");
	        }
	        else if(event.message.toLowerCase() == "testdbget") {
	            context.simpledb.doGet("putby")
	        }
	        else if(event.message.toLowerCase() == "testdbput") {
	            context.simpledb.doPut("putby", event.sender);
	        } else if(event.message.startsWith("calculate")) {
	            event.message = event.message.replace(/\s+/g, '');
	            event.message = event.message.replace("+","plus")
	            context.simplehttp.makePost("http://tutorbot-superdev.rhcloud.com/wolf?question="+event.message)
	        }
	        else {
	            context.sendResponse('No keyword found : '+event.message); 
	        } 
	    }
	    /** Functions declared below are required **/
	    function EventHandler(context, event) {
	        if(! context.simpledb.botleveldata.numinstance)
	            context.simpledb.botleveldata.numinstance = 0;
	        numinstances = parseInt(context.simpledb.botleveldata.numinstance) + 1;
	        context.simpledb.botleveldata.numinstance = numinstances;
	        context.sendResponse("Thanks for adding me. You are:" + numinstances);
	    }
	
	    function HttpResponseHandler(context, event) {
	        
	        var parsed = JSON.parse(event.getresp)
	        context.sendResponse(parsed)
	       
	    }
	
	    function DbGetHandler(context, event) {
	        context.sendResponse("testdbput keyword was last get by:" + event.dbval);
	    }
	
	    function DbPutHandler(context, event) {
	        context.sendResponse("testdbput keyword was last put by:" + event.dbval);
	    }