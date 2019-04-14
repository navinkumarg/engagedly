// We are going to create and export configuration variables

//Container for all the environments

var environments = {};


//Staging (default) environment

environments.staging  =
{
	'httpPort' : 3000,
	'httpsPort': 3001,
	'envName' : 'staging',
	'hashingSecret' : 'thisIsASecret',
	'tokenLength' : 20,
	'maxChecksLimit' : 5,
	'twilio' : {
		'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
		'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
		'fromPhone' : '+15005550006'
	}
};


//Production Object

environments.production = 
{
	'httpPort' : 5000,
	'httpsPort': 5001,
	'envName' : 'production',
	'hashingSecret' : 'thisIsASecret',
	'tokenLength' : 20,
	'maxChecksLimit' : 5,
	'twilio' : {
		'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
		'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
		'fromPhone' : '+15005550006'
	}
}


//Decision of which one needs to be exported out from the Command Line Argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

//Check that the current environmnent is one of the above ones, if not, default to staging
var environmentToExport =  typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging ;

//Export the module


module.exports = environmentToExport; 


