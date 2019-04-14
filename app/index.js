/*
* Primary file for the API
*
*
*/


//Dependencies


var server = require('./lib/server');
var workers = require('./lib/workers');


//Declare the app

var app = {}


//Init

app.init = function() {

//Start the server
server.init();

//Start the workers
workers.init();

};


//Execute

app.init();



//Export the module
module.exports = app;