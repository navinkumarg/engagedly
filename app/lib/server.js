/*
* Server-related tasks
*
*
*/
//Dependencies
var config = require('./config');
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');
var util = require('util');
var debug = util.debuglog('server'); 



//Instantiate the server module object
var server = {};

//Instantiating the http server
server.httpServer = http.createServer(function(req,res)
	{
		server.unifiedServer(req,res);
	});

//Instantiating the https server
	server.httpsServerOptions = {
	'key': fs.readFileSync(path.join(__dirname,'/../https/key.pem')),  
	'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
	};
	server.httpsServer = https.createServer(server.httpsServerOptions,function(req,res)
	{
		server.unifiedServer(req,res);
	});





	//Unified Server : All the server logic for http and https

	server.unifiedServer = function(req,res)
	{
		// Get the URL and parse it
		var parsedUrl = url.parse(req.url,true);
		//Get the path from the URL
		var path = parsedUrl.pathname;
		var trimmedPath = path.replace(/^\/+|\/+$/g,'');
		//Get the query string as an object
		var queryStringObject = parsedUrl.query; 
		//Get the http method
		var method = req.method.toLowerCase();
		//Get the headers as an object  
		var headers = req.headers;
		//Get the payload, if any
		var decoder = new StringDecoder('utf-8');
		var buffer = '';
		req.on('data',function(data) {
			buffer += decoder.write(data);
		});
		
		req.on('end',function() {
			buffer+= decoder.end();

		//Choose the handler this request should go to. If not found send to not found handler.
		var choosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound ;

		//Construct the data handler to send to the object	
		var data = {
        'trimmedPath' : trimmedPath,
        'queryStringObject' : queryStringObject,
        'method' : method,
        'headers' : headers,
        'payload' : helpers.parseJsonToObject(buffer)
      };
		//Route the request to the specified handler in the router
		choosenHandler(data,function(statusCode,payload) {
			//Use the status code calledback by the handler or default 200
			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
			
			//Use the payload called by the hanlder or return an emply object
			payload = typeof(payload) == 'object' ? payload : {}; 

			//Covert the payload to a string
			var payloadString = JSON.stringify(payload);

			//Return the response
			res.setHeader('Content-Type','Application/JSON');
			res.writeHead(statusCode);
			res.end(payloadString);

			//If the response is 200, else response in red
			if(statusCode == 200){
				debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /' + trimmedPath+ ' ' + statusCode)

			} else {
				debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /' + trimmedPath+ ' ' + statusCode)

			}
			debug('Returning the response',statusCode,payloadString);
		});
	});



	};

	//Define a request router
	server.router = {
	 'sample' : handlers.sample,
	// 'ping' : handlers.ping,
	 //'hello' : handlers.hello,
	 'users' : handlers.users,
	 'tokens' : handlers.tokens,
	 'checks' : handlers.checks,
	 'menu' : handlers.menu,
	 'addtocart' : handlers.addtocart,
	 'orderfood' : handlers.orderfood
	};


//Init the server
 server.init = function() {
//Start the HTTP server
server.httpServer.listen(config.httpPort,function(){
	
	console.log('\x1b[36m%s\x1b[0m',"This server is listening on "+config.httpPort + " in "+ config.envName+ " mode now. ");
});


//Start the HTTPS server
server.httpsServer.listen(config.httpsPort,function(){
	console.log('\x1b[35m%s\x1b[0m',"This server is listening on "+config.httpsPort + " in "+ config.envName+ " mode now. ");
});

}




//Export the server
module.exports = server;




