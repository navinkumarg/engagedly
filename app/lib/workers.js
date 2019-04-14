/*
* Worker Related Tasks
*
*/

//Dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');
var config = require('./config');
var _logs = require('./logs');
var zlib = require('zlib');
var util = require('util');
var debug = util.debuglog('workers'); 


//Instantiate the worker object
var workers = {};



//Lookup all checks and get their data and send it to validator

workers.gatherAllChecks = function() {

//Get all the checks which exist in the system
_data.list('checks',function(err,checks){
	if(!err && checks && checks.length >0) {
		checks.forEach(function(check) {
			//Read in the check data
			_data.read('checks',check,function(err,originalCheckData) {
				if(!err && originalCheckData) { 
					//Pass the data to the check validator and let that function contnue or log errors as needed
					workers.validateCheckData(originalCheckData);
				} else {
					debug(err,"Error reading one of the checks data");
				}
			})
		})

	} else {
		debug("Error: Could not find any checks to process");

	}
})
};

//Sanity Checking the check data
workers.validateCheckData = function(originalCheckData) {
	originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
	originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == config.tokenLength ? originalCheckData.id.trim() : false;
	originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
	originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) >  -1 ? originalCheckData.protocol : false;
	originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false ; 
	originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post','get','put','delete'].indexOf(originalCheckData.method) >  -1 ? originalCheckData.method : false;
	originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array  && originalCheckData.successCodes.length > 0? originalCheckData.successCodes : false ; 
	originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >=1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false ; 

	//Set the keys that may not be set if the workers would have not seen the checks before
	originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) >  -1 ? originalCheckData.state : 'down';
	originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked >0  ? originalCheckData.lastChecked : false ; 



	//If all the checks passed, then pass the data along the next process
	if(originalCheckData.id && 
		originalCheckData.userPhone &&
		originalCheckData.protocol &&
		originalCheckData.url && 
		originalCheckData.method &&
		originalCheckData.successCodes &&
		originalCheckData.timeoutSeconds
		) {
		workers.performCheck(originalCheckData);
	} else {
		debug("One of the checks is not properly formatted. Skipping it.");
	}

};

//Perform the check, send the original data and the outcome of the check process to the next step in the check process
workers.performCheck = function (originalCheckData) {
	//Prepare the initial check outcome
	var checkOutcome = {
		'error' : false,
		'responseCode' : false
	}

	//Mark that the outcome has not been send yet.
	var outcomeSent = false;


	//Parse the hostname and the path out of the original check data
	var parsedUrl = url.parse(originalCheckData.protocol+'://'+ originalCheckData.url,true);
	var hostName = parsedUrl.hostname;
	var path = parsedUrl.path; // We want the path and not path name, because we want the query string

	var requestDetails = {
		'protocol' : originalCheckData.protocol+":",
		'hostname' : hostName,
		'method' : originalCheckData.method.toUpperCase(),
		'path' : path,
		'timeout' : originalCheckData.timeoutSeconds * 1000
	}

	//Instantiate the request object using either the http or https module
	var _moduleToUse = originalCheckData.protocol == 'http' ? http : https ;

	var req = _moduleToUse.request(requestDetails,function(res) {
		//Grab the status of the send request
		var status = res.statusCode;

		//Update the checkOutcome and pass the data along
		checkOutcome.responseCode = status;

		if(!outcomeSent) {
			workers.processCheckOutcome(originalCheckData,checkOutcome);
			outcomeSent = true;
		}
	})


	//Bind to the error event so it isn't thrown

	req.on('error',function(e) {
		//Update the check outcome and pass the data along
		checkOutcome.error = {
			'error' : true,
			'value' : e
		}
		if(!outcomeSent) {
			workers.processCheckOutcome(originalCheckData,checkOutcome);
			outcomeSent = true;
		}
	})

		//Bind it to the timeout
		req.on('timeout',function(e) {
		//Update the check outcome and pass the data along
		checkOutcome.error = {
			'error' : true,
			'value' : 'timeout'
		}
		if(!outcomeSent) {
			workers.processCheckOutcome(originalCheckData,checkOutcome);
			outcomeSent = true;
		}
	})

		//End the request
		req.end();


};

//Process the check outcome and update the check data and then trigger and alert to the user
//Special logic for a check which has never been tested before.
workers.processCheckOutcome = function (originalCheckData,checkOutcome) {
	//Decide if the check up or down in its current state
	var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

	//Decide if an alert is wanted
	var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

	//Update the check data
	var timeOfCheck = Date.now();

	var newCheckData = originalCheckData;
	newCheckData.state = state;
	newCheckData.lastChecked = timeOfCheck;

	//Log the outcome of the check

	workers.log(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck);


	//Save the update to disk

	_data.update('checks',newCheckData.id,newCheckData,function(err) {
		if(!err) {
			//Send the new check data to the next phase of the process
			if(alertWarranted) {
				workers.alertUserToStatusChange(newCheckData);
			} else {
				debug("No alert on the check is Warranted, No alert send ");
			}
		} else {
			debug('Errror trying to save to one of the checks');
		}
	})
};

//Alert the user as to change in their check status
workers.alertUserToStatusChange = function(newCheckData) {
	var msg = "Alert: Your check for" + newCheckData.method.toUpperCase + " " + newCheckData.protocol + " " + newCheckData.url  + " is currently" + newCheckData.state;
	// helpers.sendTwilioSms(newCheckData.userPhone,msg,function(err) {
	// 	if(!err) {
	// 		debug("User was successfully alerted via sms", msg);

	// 	} else { 
	// 		debug("Error is notifying user via sms who had a state change in their check");
	// 	}
	// } )
 debug("send sms code here");
}



//Timer to execute the process once every one minute
workers.loop = function(){
	setInterval(function() {
		workers.gatherAllChecks();
	},1000*60);

}





//Rotate AKA compress the logs file

workers.rotateLogs = function(){
	//List all the non-compressed log files that are in the .log folder
	//true means all the files which are compressed as well as non-compressed
	//False means all the non-compressed files is needed 
	_logs.list(false,function(err,logs){
		if(!err && logs && logs.length > 0){
			logs.forEach(function(logName){
				//Compress the data to a different file
				var logId = logName.replace('.log','');
				var newFileId = logId+'-'+Date.now();
				_logs.compress(logId,newFileId,function(err){
					if(!err){
						//Truncating the log
						_logs.truncate(logId,function(err){
							if(!err){
								debug("Sucesss truncating log file");
							} else {
								debug("Error truncating log file");
							}
						})

					} else {
						debug("Error compression one of the logs",err);
					}
				});
			})


		}else{
			debug("Error: Could not find any logs to rotate");
		}
	})


}

//TImer to execute the log rotation once per day

workers.logRotationLoop = function(){
	setInterval(function(){
		workers.rotateLogs();
	},1000*60*60*24)

}


//Init the script
workers.init = function() {

	//Send to console, in yellow

	console.log('\x1b[33m%s\x1b[0m','Background workers are running');



	
	//Execute all the checks as soon as this starts up
	workers.gatherAllChecks();


	//Call the loop so that the checks continue will execute later on
	workers.loop();


	//Compress all the logs immediately
	workers.rotateLogs();


	//Call the compression loop so logs will be compressed later on
	workers.logRotationLoop();

}


workers.log = function(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck) {
	//Form the log data
	var logData = {
		'check' : originalCheckData,
		'outcome' : checkOutcome,
		'state' : state,
		'alert' : alertWarranted,
		'time' : timeOfCheck
	}

//Convert data to a string
var logString = JSON.stringify(logData);


//Determine the name of log file

var logFileName = originalCheckData.id;

//Append the log string to the file we want to write to
_logs.append('logFileName',logString,function(err) {
	if(!err) {
		debug("Logging to file successed");
	} else {
		debug("Logging to file failed");
	}
})


}





//Export the worker object
module.exports = workers;