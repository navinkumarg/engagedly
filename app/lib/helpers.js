/*

Helpers for various tasks

*/
//Dependencies

var crypto = require('crypto');
var config = require('./config');
var querystring = require('querystring');
var https = require('https');


//Container for all the helpers
var helpers = {}


//Create a SHA2256 hash function
helpers.hash = function (str){
	if(typeof(str) == 'string' && str.length > 0){
		var hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex');
		return hash;
	}
	else{
		return false;
	}
};

// Parse a Json String to an object in all cases without throwing

helpers.parseJsonToObject = function(str){
	try{
		var obj = JSON.parse(str);
		return obj;
	}catch(e) {
		return {};
	}
};


// Function helping us create a string of Random alphanuemric characters, of a given length

helpers.createRandomString = function(strLength){
	strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
	if(strLength){
		//Define all the possible characters that can go into the string
		var possibleCharacters = 'abcdefghijklmnopqrstuvqwxyz1234567890';

		//Final string
		var str = '';
		for(var i=0 ; i< strLength ; i++){
			//Get the random characters from the possible characters
			var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

			//Append the characters to the final string
			str+=randomCharacter
		}
		//Return the final string
		return str;
	}else{
		return false;
	}
}


//Sending an SMS via Twilio

helpers.sendTwilioSms = function(phone,msg,callback) {

//validation of parameters
var phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
var msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg : false;
if(phone && msg) {
	//Configure the request payload
	var payload  = {
		'From' : config.twilio.fromPhone,
		'To' : '+1' + phone,
		'Body' : msg
	};

	//Stringify the payload
	var stringPayload = querystring.stringify(payload);

	//Configure the request details
	var requestDetails = {
		'protocol' : 'https:',
		'hostname' : 'api.twilio.com',
		'method' :'POST',
		'path' : '/2014-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
		'auth' : 'config.twilio.accountSid'+':'+'config.twilio.authToken',
		'headers' : {
			'Content-Type' : 'application/x-www-form-urlencoded',
			'Content-Length' : Buffer.byteLength(stringPayload)
		}
	};

	//Intintative the request object
	var req = https.request(requestDetails,function(res){
		//Grab the status of the send request
		var status = res.statusCode;
		//Callback if status is successful
		if(status == 200 || status == 201) {
			callback(false);
		} else {
			callback('Status code returned was'+status);

		}
	});

	//Bind to the error event so that it doesnt get thrown

	req.on('error',function(e){
		callback(e);
	})

	req.write(stringPayload);

	req.end();



} else {
	callback('Given parameters are missing or invalid');
}
}




// Export the container

module.exports = helpers;